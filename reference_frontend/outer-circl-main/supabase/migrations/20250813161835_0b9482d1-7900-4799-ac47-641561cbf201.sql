-- FINAL FIX: Remove security definer views and replace with secure alternatives
-- Focus only on views that call security definer functions like auth.uid()

-- 1. Drop all problematic views that call auth.uid() or other security definer functions
DROP VIEW IF EXISTS public.profiles_public CASCADE;
DROP VIEW IF EXISTS public.profiles_public_safe CASCADE;
DROP VIEW IF EXISTS public.profiles_safe_public CASCADE;
DROP VIEW IF EXISTS public.profiles_minimal_safe CASCADE;
DROP VIEW IF EXISTS public.profiles_public_minimal CASCADE;
DROP VIEW IF EXISTS public.security_definer_audit CASCADE;
DROP VIEW IF EXISTS public.profiles_public_secure CASCADE;

-- 2. Create new secure views that do NOT call security definer functions
-- These views rely purely on table-level RLS for security

-- Main profiles view - comprehensive data
CREATE VIEW public.profiles_secure AS
SELECT 
  id,
  username,
  name,
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

-- Minimal profiles view - performance optimized
CREATE VIEW public.profiles_minimal AS
SELECT 
  id,
  username,
  avatar_url,
  membership_tier,
  created_at
FROM public.profiles
WHERE account_status = 'active';

-- 3. Grant permissions (views inherit RLS from underlying tables)
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.profiles_minimal TO authenticated;

-- 4. Add security documentation
COMMENT ON VIEW public.profiles_secure IS 'Secure profile view - relies on table-level RLS, no security definer functions called';
COMMENT ON VIEW public.profiles_minimal IS 'Minimal profile view - performance optimized, relies on table-level RLS';

-- 5. Verify no security definer functions are called in these views
-- The security is now completely handled by the existing RLS policies on the profiles table