-- Secure the public profiles view to avoid exposing sensitive PII
-- Recreate profiles_public as a limited view over the privacy-enforced table
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  name,
  username,
  bio,
  avatar_url,
  banner_url,
  membership_tier,
  interests,
  languages,
  created_at
FROM public.profiles_public_secure;

-- Ensure the view runs with invoker privileges so underlying RLS applies to the caller
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- Document the intent
COMMENT ON VIEW public.profiles_public IS 'Public, privacy-safe profile view exposing non-PII only (no email, phone, or Stripe IDs). Backed by profiles_public_secure with RLS and privacy rules.';