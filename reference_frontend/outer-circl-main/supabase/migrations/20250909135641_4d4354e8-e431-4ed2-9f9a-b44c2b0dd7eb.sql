-- Further strengthen invitation security and address remaining vulnerabilities

-- Add additional constraint to prevent any potential bypasses
ALTER TABLE public.invitations ADD CONSTRAINT invitations_valid_status 
CHECK (status IN ('pending', 'accepted', 'expired'));

-- Create additional security function for invitation access validation
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

-- Update invitation policies to use the validation function
DROP POLICY IF EXISTS "invitations_recipient_view_only" ON public.invitations;

CREATE POLICY "invitations_validated_access_only" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND validate_invitation_access(id, auth.uid())
);

-- Add audit logging for invitation access attempts
CREATE OR REPLACE FUNCTION public.log_invitation_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all invitation access attempts
  PERFORM public.log_security_event_secure(
    'invitation_access_attempt',
    'invitations',
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'operation', TG_OP,
      'user_id', auth.uid(),
      'email_involved', COALESCE(NEW.email, OLD.email),
      'subscription_id', COALESCE(NEW.subscription_id, OLD.subscription_id)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for invitation access logging
DROP TRIGGER IF EXISTS trigger_log_invitation_access ON public.invitations;
CREATE TRIGGER trigger_log_invitation_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION log_invitation_access_attempt();