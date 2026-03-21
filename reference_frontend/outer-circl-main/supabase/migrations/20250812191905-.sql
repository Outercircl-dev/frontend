-- Replace insecure view with RLS-enforced backing table

DROP VIEW IF EXISTS public.profiles_public;

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
FROM public.profiles_public_secure;

-- Preserve access grants (underlying RLS still enforces privacy)
DO $$
BEGIN
  GRANT SELECT ON public.profiles_public TO anon, authenticated;
EXCEPTION WHEN others THEN NULL;
END $$;

COMMENT ON VIEW public.profiles_public IS 'Proxy view of profiles_public_secure to enforce RLS-backed privacy. Underlying table policies control row visibility.';