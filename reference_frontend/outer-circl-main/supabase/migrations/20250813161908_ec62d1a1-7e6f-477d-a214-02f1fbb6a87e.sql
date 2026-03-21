-- TARGETED FIX: Remove only the problematic views that call security definer functions
-- Replace them with clean views that rely on table-level RLS

-- 1. Drop only the actual views (not tables) that call security definer functions
DROP VIEW IF EXISTS public.profiles_public CASCADE;
DROP VIEW IF EXISTS public.profiles_public_safe CASCADE;
DROP VIEW IF EXISTS public.profiles_safe_public CASCADE;
DROP VIEW IF EXISTS public.profiles_minimal_safe CASCADE;
DROP VIEW IF EXISTS public.profiles_public_minimal CASCADE;
DROP VIEW IF EXISTS public.security_definer_audit CASCADE;

-- 2. Create replacement views that do NOT call auth.uid() or other security definer functions
-- Security is handled by the RLS policies on the underlying profiles table

CREATE VIEW public.profiles_public_view AS
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

CREATE VIEW public.profiles_minimal_view AS
SELECT 
  id,
  username,
  avatar_url,
  membership_tier,
  created_at
FROM public.profiles
WHERE account_status = 'active';

-- 3. Grant permissions - security is enforced by the RLS policies on the profiles table
GRANT SELECT ON public.profiles_public_view TO authenticated;
GRANT SELECT ON public.profiles_minimal_view TO authenticated;

-- 4. Document the security approach
COMMENT ON VIEW public.profiles_public_view IS 'Profile view without security definer functions - security enforced by table-level RLS';
COMMENT ON VIEW public.profiles_minimal_view IS 'Minimal profile view without security definer functions - security enforced by table-level RLS';