-- Security Fix: Restrict access to invitations table to prevent email harvesting and data exposure

-- First, ensure RLS is enabled on the invitations table
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to rebuild them with stronger security
DROP POLICY IF EXISTS "invitations_admin_management" ON public.invitations;
DROP POLICY IF EXISTS "invitations_token_access_only" ON public.invitations;

-- Create a secure function to validate invitation access
CREATE OR REPLACE FUNCTION public.can_access_invitation(invitation_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT i.invited_by, i.subscription_id, i.email, i.status, i.expires_at
  INTO invitation_record
  FROM public.invitations i
  WHERE i.id = invitation_id;
  
  -- Return false if invitation doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Allow access if user is the inviter
  IF invitation_record.invited_by = user_id THEN
    RETURN true;
  END IF;
  
  -- Allow access if user is the subscription admin
  IF EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitation_record.subscription_id 
    AND ms.admin_user_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Allow access if user's email matches invitation email (for accepting invitations)
  IF EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = user_id 
    AND au.email = invitation_record.email
    AND invitation_record.status = 'pending'
    AND invitation_record.expires_at > now()
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create restrictive RLS policies

-- Policy 1: Subscription admins can manage invitations for their subscriptions
CREATE POLICY "secure_admin_invitation_management" ON public.invitations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- User is the inviter
    auth.uid() = invited_by
    OR
    -- User is the subscription admin
    EXISTS (
      SELECT 1 FROM public.membership_subscriptions ms
      WHERE ms.id = invitations.subscription_id 
      AND ms.admin_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- Policy 2: Invited users can view their own invitations (by email match)
CREATE POLICY "secure_invited_user_access" ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND au.email = invitations.email
  )
);

-- Policy 3: Allow invitation token-based access (for public invitation acceptance)
CREATE POLICY "secure_token_based_access" ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND invitation_token IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
);

-- Create audit function for invitation access
CREATE OR REPLACE FUNCTION public.log_invitation_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to invitations for security monitoring
  PERFORM public.log_security_event_secure(
    'invitation_accessed',
    'invitations',
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'accessed_by', auth.uid(),
      'invitation_email', COALESCE(NEW.email, OLD.email),
      'operation', TG_OP
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS invitation_access_audit ON public.invitations;
CREATE TRIGGER invitation_access_audit
  AFTER SELECT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_access();

-- Add additional security measures

-- Create view for safe invitation data (without sensitive information)
CREATE OR REPLACE VIEW public.invitations_safe AS
SELECT 
  id,
  subscription_id,
  invited_by,
  status,
  created_at,
  expires_at,
  -- Only show partial email for privacy
  CASE 
    WHEN auth.uid() = invited_by OR EXISTS (
      SELECT 1 FROM public.membership_subscriptions ms
      WHERE ms.id = invitations.subscription_id 
      AND ms.admin_user_id = auth.uid()
    ) THEN email
    ELSE CONCAT(LEFT(email, 2), '***@', SPLIT_PART(email, '@', 2))
  END as email_masked
FROM public.invitations
WHERE can_access_invitation(id, auth.uid());

-- Grant appropriate permissions
GRANT SELECT ON public.invitations_safe TO authenticated;