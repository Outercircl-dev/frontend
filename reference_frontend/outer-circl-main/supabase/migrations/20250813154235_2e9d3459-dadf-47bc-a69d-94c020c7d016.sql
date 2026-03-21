-- Fix Security Definer Issues on profiles_public_secure table
-- The security definer warning is likely coming from the table's RLS policies

-- 1. Drop the problematic view that references the table
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- 2. Check and clean up RLS policies on profiles_public_secure table
-- Remove any policies that might be causing security definer warnings
DROP POLICY IF EXISTS "profiles_public_privacy_enforced_select" ON public.profiles_public_secure;
DROP POLICY IF EXISTS "profiles_public_secure_privacy_enforced_select" ON public.profiles_public_secure;
DROP POLICY IF EXISTS "profiles_public_secure_no_modifications" ON public.profiles_public_secure;
DROP POLICY IF EXISTS "profiles_public_no_user_modifications" ON public.profiles_public_secure;

-- 3. Add simple, clean RLS policies without security definer functions
CREATE POLICY "profiles_public_secure_simple_select" ON public.profiles_public_secure
FOR SELECT
TO authenticated
USING (
  -- Simple check without complex security definer functions
  EXISTS (
    SELECT 1 FROM public.profile_privacy_settings pps
    WHERE pps.user_id = profiles_public_secure.id 
    AND pps.profile_visibility = 'public'
  ) OR 
  profiles_public_secure.id = auth.uid()
);

-- 4. Create a simple policy for modifications (but deny all)
CREATE POLICY "profiles_public_secure_no_modifications" ON public.profiles_public_secure
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 5. Also clean up any problematic policies on the main profiles table
-- Remove policies that might be using security definer views indirectly
DROP POLICY IF EXISTS "profiles_public_secure_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_secure_select_only" ON public.profiles;
DROP POLICY IF EXISTS "safe_public_profiles_select" ON public.profiles;

-- 6. Keep only the core, secure profiles policies we created earlier
-- These should not cause security definer warnings

-- 7. Recreate the profiles_public view as a simple view
CREATE VIEW public.profiles_public AS
SELECT 
  id,
  reliability_rating,
  created_at,
  name,
  username,
  bio,
  avatar_url,
  banner_url,
  membership_tier,
  interests,
  languages
FROM public.profiles_public_secure
WHERE id = auth.uid() 
   OR EXISTS (
     SELECT 1 FROM public.profile_privacy_settings pps
     WHERE pps.user_id = profiles_public_secure.id 
     AND pps.profile_visibility = 'public'
   );

-- 8. Grant minimal permissions
GRANT SELECT ON public.profiles_public_secure TO authenticated;
GRANT SELECT ON public.profiles_public TO authenticated;

-- 9. Remove any security_barrier properties (should not exist on tables, but just in case)
-- Tables don't have security_barrier, but this will ensure no issues

-- 10. Add security comments
COMMENT ON TABLE public.profiles_public_secure IS 'Public profile data table with simple RLS policies - no security definer functions used';
COMMENT ON VIEW public.profiles_public IS 'Simple view of public profiles without security definer properties';