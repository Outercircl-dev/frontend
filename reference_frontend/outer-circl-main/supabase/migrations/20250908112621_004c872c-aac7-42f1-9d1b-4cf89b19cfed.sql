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

-- Create function to validate admin access to subscriptions
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

-- Create restrictive RLS policies

-- Policy 1: Subscription admins can manage invitations for their subscriptions
CREATE POLICY "secure_admin_invitation_management" ON public.invitations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- User is the inviter AND subscription admin
    (auth.uid() = invited_by AND validate_invitation_admin_access(subscription_id, auth.uid()))
    OR
    -- User is the subscription admin (even if not the inviter)
    validate_invitation_admin_access(subscription_id, auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND validate_invitation_admin_access(subscription_id, auth.uid())
);

-- Policy 2: Invited users can view their own invitations (by email match only)
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

-- Policy 3: Allow invitation token-based access (restricted to valid tokens only)
CREATE POLICY "secure_token_based_access" ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND invitation_token IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
  AND LENGTH(invitation_token::text) = 36  -- Valid UUID format
);

-- Create audit function for invitation modifications (not SELECT)
CREATE OR REPLACE FUNCTION public.log_invitation_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log modifications to invitations for security monitoring
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event_secure(
      'invitation_created',
      'invitations',
      NEW.id,
      true,
      jsonb_build_object(
        'created_by', auth.uid(),
        'subscription_id', NEW.subscription_id,
        'operation', TG_OP
      )::text
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event_secure(
      'invitation_updated',
      'invitations',
      NEW.id,
      true,
      jsonb_build_object(
        'updated_by', auth.uid(),
        'subscription_id', NEW.subscription_id,
        'status_change', NEW.status != OLD.status,
        'operation', TG_OP
      )::text
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event_secure(
      'invitation_deleted',
      'invitations',
      OLD.id,
      true,
      jsonb_build_object(
        'deleted_by', auth.uid(),
        'subscription_id', OLD.subscription_id,
        'operation', TG_OP
      )::text
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for audit logging (only for modifications)
DROP TRIGGER IF EXISTS invitation_modification_audit ON public.invitations;
CREATE TRIGGER invitation_modification_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_modification();

-- Create view for safe invitation data (without sensitive information)
CREATE OR REPLACE VIEW public.invitations_safe AS
SELECT 
  id,
  subscription_id,
  invited_by,
  status,
  created_at,
  expires_at,
  -- Only show partial email for privacy - mask sensitive parts
  CASE 
    WHEN validate_invitation_admin_access(subscription_id, auth.uid()) THEN email
    ELSE CONCAT(LEFT(email, 2), '***@', SPLIT_PART(email, '@', 2))
  END as email_masked,
  -- Never expose invitation token in views
  NULL as invitation_token
FROM public.invitations
WHERE 
  auth.uid() IS NOT NULL
  AND (
    validate_invitation_admin_access(subscription_id, auth.uid())
    OR (
      status = 'pending' 
      AND expires_at > now()
      AND EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND au.email = invitations.email
      )
    )
  );

-- Grant appropriate permissions on the view
GRANT SELECT ON public.invitations_safe TO authenticated;