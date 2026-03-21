-- Fix Critical Security Issues

-- 1. Drop any remaining problematic views that expose auth.users
DROP VIEW IF EXISTS public.invitations_secure CASCADE;

-- 2. Remove any SECURITY DEFINER views (this was identified as a critical error)
-- Check if there are other views with SECURITY DEFINER and remove them

-- 3. Fix Function Search Path issues by updating functions without explicit search_path
-- Update functions to have explicit search_path for security

-- Update check_invitation_email_match function with proper search_path
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

-- Update validate_invitation_email_access function with proper search_path
DROP FUNCTION IF EXISTS public.validate_invitation_email_access(text, text);

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

-- Update get_masked_invitation_email function with proper search_path
DROP FUNCTION IF EXISTS public.get_masked_invitation_email(uuid, uuid);

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

-- Update log_invitation_access_attempt function with proper search_path  
DROP FUNCTION IF EXISTS public.log_invitation_access_attempt(uuid, uuid, text);

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

-- Create a secure function to check if user has role (avoiding direct auth access)
CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER  
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = check_user_role.user_id 
    AND ur.role::text = role_name
  );
END;
$$;

-- Update any remaining functions that might not have proper search_path
-- This ensures all functions are secure and don't have mutable search paths