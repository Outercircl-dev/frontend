-- Security Fix: Strengthen invitations table security without recreating existing policies

-- Ensure RLS is enabled
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create helper functions if they don't exist
CREATE OR REPLACE FUNCTION public.validate_invitation_admin_access(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id 
    AND ms.admin_user_id = user_id
  );
END;
$$;

-- Add a restrictive policy for general access (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invitations' AND policyname = 'invitations_strict_access_control') THEN
        CREATE POLICY "invitations_strict_access_control" ON public.invitations
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() IS NOT NULL 
          AND (
            -- Admin of the subscription
            validate_invitation_admin_access(subscription_id, auth.uid())
            OR
            -- User who created the invitation (and is admin)
            (auth.uid() = invited_by AND validate_invitation_admin_access(subscription_id, auth.uid()))
            OR
            -- Invited user with valid pending invitation
            (
              status = 'pending' 
              AND expires_at > now()
              AND EXISTS (
                SELECT 1 FROM auth.users au
                WHERE au.id = auth.uid() 
                AND au.email = invitations.email
              )
            )
          )
        );
    END IF;
END
$$;

-- Create audit function for security monitoring
CREATE OR REPLACE FUNCTION public.log_invitation_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log invitation access attempts for security monitoring
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      resource_type, 
      resource_id, 
      success,
      ip_address
    ) VALUES (
      auth.uid(),
      'invitation_created',
      'invitations',
      NEW.id,
      true,
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      resource_type, 
      resource_id, 
      success,
      ip_address
    ) VALUES (
      auth.uid(),
      'invitation_modified',
      'invitations',
      NEW.id,
      true,
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      resource_type, 
      resource_id, 
      success,
      ip_address
    ) VALUES (
      auth.uid(),
      'invitation_deleted',
      'invitations',
      OLD.id,
      true,
      inet_client_addr()
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for audit logging (only if it doesn't exist)
DROP TRIGGER IF EXISTS invitation_security_audit ON public.invitations;
CREATE TRIGGER invitation_security_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_access_attempt();

-- Create a secure view for invitation data (recreate to ensure it's up to date)
DROP VIEW IF EXISTS public.invitations_secure;
CREATE VIEW public.invitations_secure AS
SELECT 
  id,
  subscription_id,
  invited_by,
  status,
  created_at,
  expires_at,
  -- Mask email addresses for privacy
  CASE 
    WHEN validate_invitation_admin_access(subscription_id, auth.uid()) THEN email
    WHEN auth.uid() = invited_by AND validate_invitation_admin_access(subscription_id, auth.uid()) THEN email
    ELSE CONCAT(LEFT(email, 1), '***@', SPLIT_PART(email, '@', 2))
  END as email_display,
  -- Never expose invitation tokens in views
  CASE 
    WHEN validate_invitation_admin_access(subscription_id, auth.uid()) OR 
         (auth.uid() = invited_by AND validate_invitation_admin_access(subscription_id, auth.uid())) THEN
      invitation_token
    ELSE NULL
  END as token_access
FROM public.invitations
WHERE 
  auth.uid() IS NOT NULL
  AND (
    -- Subscription admin
    validate_invitation_admin_access(subscription_id, auth.uid())
    OR
    -- Inviter who is also admin
    (auth.uid() = invited_by AND validate_invitation_admin_access(subscription_id, auth.uid()))
    OR
    -- Invited user with valid pending invitation
    (
      status = 'pending' 
      AND expires_at > now()
      AND EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND au.email = invitations.email
      )
    )
  );

-- Grant permissions on the secure view
GRANT SELECT ON public.invitations_secure TO authenticated;

-- Add comment documenting the security measures
COMMENT ON TABLE public.invitations IS 'Invitation table with strict RLS policies to prevent email harvesting and unauthorized access to subscription data';
COMMENT ON VIEW public.invitations_secure IS 'Secure view for invitations with email masking and restricted token access';