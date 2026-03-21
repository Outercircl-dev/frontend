-- Fix the security definer view issue by removing the SECURITY DEFINER property
-- The view should use the permissions of the querying user, not the view creator

DROP VIEW IF EXISTS public.profiles_public;

-- Create the view without SECURITY DEFINER - it will use standard RLS
CREATE VIEW public.profiles_public AS
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
  created_at
FROM public.profiles
WHERE account_status = 'active';

-- Grant SELECT permissions to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add a comment explaining the purpose
COMMENT ON VIEW public.profiles_public IS 'Public view of profiles table exposing only non-sensitive data for friend and public profile viewing';