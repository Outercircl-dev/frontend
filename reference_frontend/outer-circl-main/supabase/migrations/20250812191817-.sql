-- Secure the public profiles exposure by redefining the view to use the RLS-protected table
-- This preserves existing columns and avoids breaking application code while enforcing privacy via underlying RLS

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

COMMENT ON VIEW public.profiles_public IS 'Proxy view of profiles_public_secure to enforce RLS-backed privacy. Do not grant direct table access; underlying RLS applies.';