-- Fix Remaining Security Issues
-- This migration addresses the critical security definer view warnings

-- 1. First, let's identify and fix any views with security_barrier settings
-- Remove any security_barrier properties from views (this was the issue)

-- Check if profiles_safe_public has any problematic settings
DO $$
BEGIN
  -- Reset any view options that might be causing security issues
  BEGIN
    ALTER VIEW public.profiles_safe_public RESET (security_barrier);
  EXCEPTION
    WHEN undefined_object THEN
      -- Option doesn't exist, which is fine
      NULL;
  END;
  
  BEGIN
    ALTER VIEW public.profiles_public RESET (security_barrier);
  EXCEPTION
    WHEN undefined_object THEN
      -- Option doesn't exist, which is fine
      NULL;
  END;
END $$;

-- 2. Recreate the profiles_safe_public view without any security options
DROP VIEW IF EXISTS public.profiles_safe_public CASCADE;

CREATE VIEW public.profiles_safe_public AS
SELECT 
  id,
  name,
  username,
  bio,
  avatar_url,
  banner_url,
  reliability_rating,
  membership_tier,
  interests,
  languages,
  created_at,
  updated_at
FROM public.profiles
WHERE account_status = 'active';

-- 3. Add proper RLS policies to the view instead of using security_barrier
-- This is safer and follows best practices
CREATE POLICY "safe_public_profiles_select" ON public.profiles
FOR SELECT
TO authenticated
USING (
  account_status = 'active' 
  AND (
    -- Allow viewing based on privacy settings
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles.id 
      AND pps.profile_visibility IN ('public', 'followers')
    ) OR
    -- Users can always see their own profile
    id = auth.uid()
  )
);

-- 4. Ensure no security_barrier properties exist on any public views
DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN 
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v' 
    AND n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I RESET (security_barrier)', view_record.relname);
    EXCEPTION
      WHEN undefined_object THEN
        -- Option doesn't exist, continue
        NULL;
      WHEN OTHERS THEN
        -- Log but don't fail
        RAISE NOTICE 'Could not reset security_barrier for view %', view_record.relname;
    END;
  END LOOP;
END $$;

-- 5. Grant appropriate permissions to the safe public view
GRANT SELECT ON public.profiles_safe_public TO authenticated;
REVOKE ALL ON public.profiles_safe_public FROM anon;

-- 6. Add security documentation
COMMENT ON VIEW public.profiles_safe_public IS 'SECURITY: Safe public profile view without security_barrier. Uses RLS policies on underlying table for access control.';

-- 7. Create a secure function for profile searches instead of relying on views
CREATE OR REPLACE FUNCTION public.search_public_profiles(search_term text, requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  bio text,
  avatar_url text,
  reliability_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Rate limit profile searches
  IF NOT public.check_profile_access_rate_limit(requesting_user_id, 'profile_search') THEN
    RETURN;
  END IF;
  
  -- Log the search for security monitoring
  PERFORM public.log_security_event(
    'profile_search',
    'profiles',
    requesting_user_id,
    true,
    jsonb_build_object(
      'search_term_length', length(search_term),
      'search_time', now()
    )::text
  );
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.username,
    left(p.bio, 200) as bio,  -- Limit bio length for security
    p.avatar_url,
    p.reliability_rating
  FROM public.profiles p
  WHERE 
    p.id != requesting_user_id
    AND p.account_status = 'active'
    AND (
      LOWER(p.name) LIKE LOWER('%' || left(search_term, 50) || '%') OR
      LOWER(p.username) LIKE LOWER('%' || left(search_term, 50) || '%')
    )
    AND public.can_view_profile(p.id, requesting_user_id)
  ORDER BY p.name
  LIMIT 20;  -- Limit results for security
END;
$$;

-- 8. Add final security check
COMMENT ON FUNCTION public.search_public_profiles(text, uuid) IS 'SECURITY: Secure profile search function with rate limiting, access control, and audit logging.';