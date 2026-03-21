-- Recreate the view with the exact same columns to avoid column drop/add errors,
-- but source it from the privacy-enforced table
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

ALTER VIEW public.profiles_public SET (security_invoker = on);

COMMENT ON VIEW public.profiles_public IS 'Privacy-safe public profile view (invoker rights). Mirrors non-PII fields from profiles_public_secure under RLS.';