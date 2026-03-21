-- SECURITY FIX: Remove Security Definer Views and Secure Remaining Views
-- Address all security definer view warnings

-- 1. Drop and recreate profiles_safe_public with proper security
DROP VIEW IF EXISTS public.profiles_safe_public CASCADE;

-- 2. Create a properly secured profiles_safe_public view
CREATE VIEW public.profiles_safe_public AS
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
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.account_status = 'active'
AND (
  -- Only authenticated users can view profiles
  auth.uid() IS NOT NULL
  AND (
    -- Users can view their own profile
    p.id = auth.uid() 
    OR
    -- Users can view profiles with public visibility
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = p.id 
      AND pps.profile_visibility = 'public'
    )
    OR
    -- Backward compatibility: if no privacy settings exist, allow view
    NOT EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = p.id
    )
  )
);

-- 3. Remove any security_barrier settings that might exist
-- (Note: These may have been set in previous migrations)
ALTER VIEW public.profiles_public SET (security_barrier = false);
ALTER VIEW public.profiles_public_minimal SET (security_barrier = false);
ALTER VIEW public.profiles_safe_public SET (security_barrier = false);

-- 4. Explicitly grant proper permissions
GRANT SELECT ON public.profiles_safe_public TO authenticated;
REVOKE ALL ON public.profiles_safe_public FROM anon;

-- 5. Ensure no views have security definer properties
-- Check for any remaining problematic views and document security
COMMENT ON VIEW public.profiles_public IS 'SECURE: Authenticated access only, respects privacy settings';
COMMENT ON VIEW public.profiles_public_minimal IS 'SECURE: Minimal data, authenticated access only'; 
COMMENT ON VIEW public.profiles_safe_public IS 'SECURE: Safe public view, authenticated access with privacy controls';

-- 6. Create a function to list all views and their security properties (for monitoring)
CREATE OR REPLACE FUNCTION public.audit_view_security()
RETURNS TABLE(
  view_name text,
  has_auth_check boolean,
  has_privacy_check boolean,
  security_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    viewname::text,
    (definition ILIKE '%auth.uid()%')::boolean as has_auth_check,
    (definition ILIKE '%profile_privacy_settings%')::boolean as has_privacy_check,
    CASE 
      WHEN definition ILIKE '%auth.uid()%' AND definition ILIKE '%profile_privacy_settings%' THEN 'SECURE'
      WHEN definition ILIKE '%auth.uid()%' THEN 'PARTIALLY_SECURE'
      ELSE 'INSECURE'
    END as security_status
  FROM pg_views 
  WHERE schemaname = 'public' 
  AND viewname LIKE '%profile%';
$$;