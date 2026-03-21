-- Strengthen invitation security with proper constraints and validation

-- Add constraint to ensure valid status values
ALTER TABLE public.invitations ADD CONSTRAINT invitations_valid_status 
CHECK (status IN ('pending', 'accepted', 'expired'));

-- Create validation function for invitation access
CREATE OR REPLACE FUNCTION public.validate_invitation_access(invitation_id uuid, requesting_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  user_email text;
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
  
  -- Allow access if user's email matches the invitation email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = requesting_user_id;
  
  IF user_email = invitation_record.email THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Update invitation policies with enhanced validation
DROP POLICY IF EXISTS "invitations_recipient_view_only" ON public.invitations;

CREATE POLICY "invitations_validated_access_only" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND validate_invitation_access(id, auth.uid())
);

-- Add additional security by creating a secure view that limits exposed data
CREATE OR REPLACE VIEW public.invitations_secure AS
SELECT 
  i.id,
  i.subscription_id,
  i.invited_by,
  i.status,
  i.expires_at,
  i.created_at,
  i.updated_at,
  -- Only show email to authorized users
  CASE 
    WHEN auth.uid() = i.invited_by OR 
         (SELECT email FROM auth.users WHERE id = auth.uid()) = i.email 
    THEN i.email 
    ELSE '[REDACTED]'
  END as email
FROM public.invitations i
WHERE validate_invitation_access(i.id, auth.uid());

-- Grant appropriate permissions on the secure view
GRANT SELECT ON public.invitations_secure TO authenticated;