-- Fix security vulnerabilities introduced by the previous migration

-- Remove the problematic view that exposes auth.users
DROP VIEW IF EXISTS public.invitations_secure;

-- Update the validation function to not directly access auth.users
CREATE OR REPLACE FUNCTION public.validate_invitation_access(invitation_id uuid, requesting_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE id = invitation_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Allow access if user is the invitation creator and admin of the subscription
  IF requesting_user_id = invitation_record.invited_by AND
     EXISTS (
       SELECT 1 FROM public.membership_subscriptions ms
       WHERE ms.id = invitation_record.subscription_id 
       AND ms.admin_user_id = requesting_user_id
     ) THEN
    RETURN true;
  END IF;
  
  -- For invited users, we'll rely on application-level validation
  -- rather than directly accessing auth.users which creates security issues
  
  RETURN false;
END;
$$;

-- Simplify the invitation policies to be more secure
DROP POLICY IF EXISTS "invitations_validated_access_only" ON public.invitations;

-- Policy for invitation creators (subscription admins)
CREATE POLICY "invitations_creator_access_only" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- For invited users to accept invitations, we'll handle this at the application level
-- with a specific endpoint that validates tokens without exposing email data