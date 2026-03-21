-- CRITICAL SECURITY FIX: Secure profiles_public View (Final)
-- Replace insecure view with properly secured version

-- 1. Drop the insecure profiles_public view
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- 2. Create a new secure profiles_public view with built-in security
CREATE VIEW public.profiles_public AS
SELECT 
  p.id,
  p.reliability_rating,
  p.created_at,
  p.name,
  p.username,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.membership_tier,
  p.interests,
  p.languages
FROM public.profiles p
WHERE p.account_status = 'active'
AND (
  -- Only show profiles to authenticated users
  auth.uid() IS NOT NULL
  AND (
    -- Users can always view their own profile
    p.id = auth.uid() 
    OR
    -- Users can view other profiles only if they have public visibility
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = p.id 
      AND pps.profile_visibility = 'public'
    )
    OR
    -- If no privacy settings exist, default to allowing view (backward compatibility)
    NOT EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = p.id
    )
  )
);

-- 3. Create an even safer minimal public profiles view
CREATE VIEW public.profiles_public_minimal AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.membership_tier,
  p.created_at
FROM public.profiles p
WHERE p.account_status = 'active'
AND auth.uid() IS NOT NULL  -- Require authentication
AND EXISTS (
  SELECT 1 FROM public.profile_privacy_settings pps
  WHERE pps.user_id = p.id 
  AND pps.profile_visibility = 'public'
);

-- 4. Grant restricted permissions
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public_minimal TO authenticated;

-- Explicitly revoke from anon (unauthenticated users)
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public_minimal FROM anon;

-- 5. Add security documentation
COMMENT ON VIEW public.profiles_public IS 'SECURED: User profile data view - requires authentication and respects privacy settings. No longer publicly accessible.';
COMMENT ON VIEW public.profiles_public_minimal IS 'MINIMAL: Reduced profile data for authenticated users viewing public profiles only.';

-- 6. Create function to safely get public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  name text,
  bio text,
  avatar_url text,
  membership_tier text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.username,
    p.name,
    p.bio,
    p.avatar_url,
    p.membership_tier
  FROM public.profiles p
  WHERE p.id = profile_id
  AND p.account_status = 'active'
  AND auth.uid() IS NOT NULL  -- Require authentication
  AND (
    p.id = auth.uid()  -- Own profile
    OR
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = p.id 
      AND pps.profile_visibility = 'public'
    )
  );
$$;