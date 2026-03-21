-- Fix security issues identified by the linter

-- Remove the problematic views that expose auth.users and use SECURITY DEFINER
DROP VIEW IF EXISTS public.invitations_secure;
DROP VIEW IF EXISTS public.invitations_safe;

-- Create a more secure function that doesn't expose auth.users
CREATE OR REPLACE FUNCTION public.check_invitation_email_match(invitation_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_email TEXT;
  user_email TEXT;
BEGIN
  -- Get invitation email
  SELECT email INTO invitation_email
  FROM public.invitations
  WHERE id = invitation_id;
  
  -- Get user email from auth.users (secure way)
  SELECT au.email INTO user_email
  FROM auth.users au
  WHERE au.id = user_id;
  
  -- Return true if emails match
  RETURN (invitation_email IS NOT NULL AND user_email IS NOT NULL AND invitation_email = user_email);
END;
$$;

-- Update the RLS policy to use the secure function instead of direct auth.users access
DROP POLICY IF EXISTS "secure_invited_user_access" ON public.invitations;
CREATE POLICY "secure_invited_user_access" ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
  AND check_invitation_email_match(id, auth.uid())
);

-- Update the strict access control policy to use secure function
DROP POLICY IF EXISTS "invitations_strict_access_control" ON public.invitations;
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
    -- Invited user with valid pending invitation (using secure function)
    (
      status = 'pending' 
      AND expires_at > now()
      AND check_invitation_email_match(id, auth.uid())
    )
  )
);

-- Create a simple, safe function for displaying masked emails that doesn't use views
CREATE OR REPLACE FUNCTION public.get_masked_invitation_email(invitation_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  full_email TEXT;
  masked_email TEXT;
BEGIN
  -- Check if user has admin access to this invitation
  SELECT i.email INTO full_email
  FROM public.invitations i
  WHERE i.id = invitation_id
    AND validate_invitation_admin_access(i.subscription_id, auth.uid());
  
  -- If admin access, return full email
  IF full_email IS NOT NULL THEN
    RETURN full_email;
  END IF;
  
  -- Otherwise, check if user is the invited person
  SELECT i.email INTO full_email
  FROM public.invitations i
  WHERE i.id = invitation_id
    AND i.status = 'pending'
    AND i.expires_at > now()
    AND check_invitation_email_match(i.id, auth.uid());
  
  -- If invited user, return masked email
  IF full_email IS NOT NULL THEN
    RETURN CONCAT(LEFT(full_email, 1), '***@', SPLIT_PART(full_email, '@', 2));
  END IF;
  
  -- No access, return null
  RETURN NULL;
END;
$$;

-- Update audit function to use proper search path
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

-- Add final security comment
COMMENT ON TABLE public.invitations IS 'Invitation table secured with strict RLS policies. Email addresses are protected from harvesting and only accessible to subscription admins and invited users. Use get_masked_invitation_email() function for safe email display.';