-- Fix Critical Security Issues - Handle Dependencies Properly

-- 1. First, temporarily drop policies that depend on check_invitation_email_match
DROP POLICY IF EXISTS "secure_invited_user_access" ON public.invitations;
DROP POLICY IF EXISTS "invitations_strict_access_control" ON public.invitations;

-- 2. Drop the problematic view that might expose auth.users
DROP VIEW IF EXISTS public.invitations_secure CASCADE;

-- 3. Now safely update the function with proper search_path
DROP FUNCTION IF EXISTS public.check_invitation_email_match(uuid, uuid);

CREATE OR REPLACE FUNCTION public.check_invitation_email_match(invitation_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_email TEXT;
  user_email TEXT;
BEGIN
  -- Get invitation email
  SELECT email INTO invitation_email
  FROM public.invitations
  WHERE id = invitation_id
    AND status = 'pending'
    AND expires_at > now();
    
  IF invitation_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user email from auth.users (this is the only secure way to get user email)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  -- Compare emails (case insensitive)
  RETURN LOWER(COALESCE(invitation_email, '')) = LOWER(COALESCE(user_email, ''));
END;
$$;

-- 4. Recreate the RLS policies using the updated function
CREATE POLICY "secure_invited_user_access" ON public.invitations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND status = 'pending'::text 
    AND expires_at > now() 
    AND check_invitation_email_match(id, auth.uid())
  );

CREATE POLICY "invitations_strict_access_control" ON public.invitations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (
      validate_invitation_admin_access(subscription_id, auth.uid()) 
      OR (
        auth.uid() = invited_by 
        AND validate_invitation_admin_access(subscription_id, auth.uid())
      ) 
      OR (
        status = 'pending'::text 
        AND expires_at > now() 
        AND check_invitation_email_match(id, auth.uid())
      )
    )
  );

-- 5. Update other functions with proper search_path
CREATE OR REPLACE FUNCTION public.validate_invitation_email_access(p_email text, p_user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    p_email IS NOT NULL 
    AND p_user_email IS NOT NULL 
    AND LOWER(p_email) = LOWER(p_user_email)
  );
END;
$$;

-- 6. Create secure masked email function
CREATE OR REPLACE FUNCTION public.get_masked_invitation_email(invitation_id uuid, requesting_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_email TEXT;
  is_admin BOOLEAN := false;
BEGIN
  -- Check if user is admin of the subscription
  SELECT EXISTS(
    SELECT 1 FROM public.invitations i
    JOIN public.membership_subscriptions ms ON ms.id = i.subscription_id
    WHERE i.id = invitation_id AND ms.admin_user_id = requesting_user_id
  ) INTO is_admin;
  
  -- Get invitation email
  SELECT email INTO invitation_email
  FROM public.invitations
  WHERE id = invitation_id;
  
  -- Return full email for admins, masked for others
  IF is_admin THEN
    RETURN invitation_email;
  ELSE
    -- Mask email for non-admins
    IF invitation_email IS NOT NULL AND position('@' in invitation_email) > 0 THEN
      RETURN substring(invitation_email, 1, 2) || '***@' || split_part(invitation_email, '@', 2);
    END IF;
    RETURN '***@***';
  END IF;
END;
$$;

-- 7. Create secure logging function  
CREATE OR REPLACE FUNCTION public.log_invitation_access_attempt(
  invitation_id uuid, 
  user_id uuid, 
  access_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log the access attempt for security monitoring
  PERFORM public.log_security_event_secure(
    'invitation_access_attempt',
    'invitations',
    invitation_id,
    true,
    jsonb_build_object(
      'user_id', user_id,
      'access_type', access_type,
      'timestamp', now()
    )::text
  );
END;
$$;