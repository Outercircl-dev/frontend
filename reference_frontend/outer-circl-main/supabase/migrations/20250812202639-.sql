-- Lock down access to profiles_public view and ensure it's privacy-safe
-- 1) Ensure view uses invoker rights (applies underlying RLS)
ALTER VIEW IF EXISTS public.profiles_public SET (security_invoker = on);

-- 2) Strip public/anon access and allow only authenticated role to select via PostgREST
REVOKE ALL ON TABLE public.profiles_public FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles_public FROM anon;
GRANT SELECT ON TABLE public.profiles_public TO authenticated;

-- 3) Double-check the view exposes only non-PII columns
--    (No-op if already matching; redefine idempotently for safety)
CREATE OR REPLACE VIEW public.profiles_public AS
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

COMMENT ON VIEW public.profiles_public IS 'Privacy-safe public profile view (invoker rights). Mirrors non-PII fields from profiles_public_secure under RLS.';