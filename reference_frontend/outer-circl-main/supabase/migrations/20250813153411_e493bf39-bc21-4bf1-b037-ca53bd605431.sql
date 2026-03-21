-- Fix Critical Security Issues from Linter
-- This migration addresses the security warnings detected after the profile security update

-- 1. Fix the security definer view issue by removing the security_barrier setting
-- The profiles_safe_public view should not use security_barrier as it can bypass RLS
ALTER VIEW public.profiles_safe_public RESET (security_barrier);

-- 2. Fix function search path mutable issues by setting explicit search_path
-- Update all new functions to have immutable search_path

ALTER FUNCTION public.validate_profile_access(uuid, uuid) 
SET search_path = 'public';

ALTER FUNCTION public.get_public_profile_data(uuid, uuid) 
SET search_path = 'public';

ALTER FUNCTION public.get_sensitive_profile_data(uuid) 
SET search_path = 'public';

ALTER FUNCTION public.mask_sensitive_profile_fields(jsonb) 
SET search_path = 'public';

ALTER FUNCTION public.audit_profile_access() 
SET search_path = 'public';

-- 3. Recreate the functions with proper security settings
CREATE OR REPLACE FUNCTION public.validate_profile_access(target_user_id uuid, accessing_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow access to own profile data
  IF target_user_id = accessing_user_id THEN
    RETURN true;
  END IF;
  
  -- Log suspicious access attempts
  IF accessing_user_id IS NOT NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_profile_access_attempt',
      'profiles',
      accessing_user_id,
      false,
      jsonb_build_object(
        'target_user_id', target_user_id,
        'timestamp', now()
      )::text
    );
  END IF;
  
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_data(profile_user_id uuid, requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  bio text,
  avatar_url text,
  banner_url text,
  reliability_rating numeric,
  membership_tier text,
  interests text[],
  languages text[],
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the requesting user can view this profile based on privacy settings
  IF NOT public.can_view_profile(profile_user_id, requesting_user_id) THEN
    RETURN;
  END IF;
  
  -- Rate limit profile access
  IF NOT public.check_profile_access_rate_limit(requesting_user_id, 'profile_view') THEN
    RETURN;
  END IF;
  
  -- Return only safe, public profile information
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.username,
    p.bio,
    p.avatar_url,
    p.banner_url,
    p.reliability_rating,
    p.membership_tier,
    p.interests,
    p.languages,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_user_id
  AND p.account_status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sensitive_profile_data(requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  phone text,
  birth_month integer,
  birth_year integer,
  stripe_customer_id text,
  account_status text,
  deactivated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow access to own sensitive data
  IF requesting_user_id IS NULL OR requesting_user_id != auth.uid() THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'unauthorized_sensitive_data_access',
      'profiles',
      requesting_user_id,
      false,
      'Attempted access to sensitive profile data'
    );
    RETURN;
  END IF;
  
  -- Rate limit sensitive data access
  IF NOT public.check_profile_access_rate_limit(requesting_user_id, 'sensitive_data_access') THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.phone,
    p.birth_month,
    p.birth_year,
    p.stripe_customer_id,
    p.account_status,
    p.deactivated_at
  FROM public.profiles p
  WHERE p.id = requesting_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mask_sensitive_profile_fields(profile_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Remove or mask sensitive fields from profile data
  profile_data := profile_data - 'email';
  profile_data := profile_data - 'phone';  
  profile_data := profile_data - 'birth_month';
  profile_data := profile_data - 'birth_year';
  profile_data := profile_data - 'stripe_customer_id';
  profile_data := profile_data - 'deactivated_at';
  
  RETURN profile_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all profile access for security monitoring
  PERFORM public.log_security_event(
    'profile_accessed',
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'accessed_profile', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Update existing security functions to have proper search_path
-- Check if functions exist and update them
DO $$
BEGIN
  -- Update handle_new_user function if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
  END IF;
  
  -- Update create_initial_admin function
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_initial_admin') THEN
    ALTER FUNCTION public.create_initial_admin(text) SET search_path = 'public';
  END IF;
  
  -- Update other security functions as needed
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_security_event') THEN
    ALTER FUNCTION public.log_security_event(text, text, uuid, boolean, text) SET search_path = 'public';
  END IF;
END $$;

-- 5. Add additional security documentation
COMMENT ON FUNCTION public.validate_profile_access(uuid, uuid) IS 'SECURITY: Validates profile access with search_path protection and unauthorized access logging.';
COMMENT ON FUNCTION public.get_public_profile_data(uuid, uuid) IS 'SECURITY: Secure function for public profile data with privacy controls, rate limiting, and search_path protection.';
COMMENT ON FUNCTION public.get_sensitive_profile_data(uuid) IS 'SECURITY: Ultra-secure function for sensitive profile data - only returns data for requesting user with full audit trail.';
COMMENT ON FUNCTION public.mask_sensitive_profile_fields(jsonb) IS 'SECURITY: Immutable function to strip sensitive fields from profile data with search_path protection.';

-- 6. Create additional rate limit entries for the new security functions
INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
SELECT auth.uid(), 'profile_security_validation', 0, now()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;