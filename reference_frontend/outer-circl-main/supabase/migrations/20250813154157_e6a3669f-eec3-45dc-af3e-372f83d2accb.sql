-- Fix Security Definer View Errors
-- The issue appears to be with views that reference other secured objects

-- 1. Drop and recreate the problematic views without security issues
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- 2. Check if profiles_public_secure is the source of security definer warnings
-- Let's replace it with a simple view without security definer properties
DROP VIEW IF EXISTS public.profiles_public_secure CASCADE;

-- 3. Recreate profiles_public_secure without any security definer properties
-- This should be a regular view with RLS policies handling security
CREATE VIEW public.profiles_public_secure AS
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

-- 4. Add RLS policy for this view (instead of security definer)
CREATE POLICY "profiles_public_secure_access" ON public.profiles
FOR SELECT
TO authenticated
USING (
  account_status = 'active' 
  AND (
    -- Allow based on privacy settings
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles.id 
      AND pps.profile_visibility = 'public'
    ) OR
    -- Allow if friends and privacy allows followers
    (
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = profiles.id 
        AND pps.profile_visibility = 'followers'
      ) AND
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE ((f.user_id = profiles.id AND f.friend_id = auth.uid()) OR
               (f.user_id = auth.uid() AND f.friend_id = profiles.id))
        AND f.status = 'accepted'
      )
    ) OR
    -- Users can see their own profile
    id = auth.uid()
  )
);

-- 5. Recreate profiles_public as a simple view
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

-- 6. Ensure no security definer properties on any views
-- Remove any existing problematic policies that might conflict
DROP POLICY IF EXISTS "profiles_public_privacy_enforced_select" ON public.profiles_public_secure;
DROP POLICY IF EXISTS "profiles_public_secure_privacy_enforced_select" ON public.profiles_public_secure;
DROP POLICY IF EXISTS "profiles_public_secure_no_modifications" ON public.profiles_public_secure;

-- 7. Add clean, simple policies
CREATE POLICY "profiles_public_secure_select_only" ON public.profiles
FOR SELECT
TO authenticated  
USING (
  account_status = 'active' AND
  public.check_profile_access_rate_limit(auth.uid(), 'profile_search') AND
  (
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles.id 
      AND pps.profile_visibility = 'public'
    ) OR
    (
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = profiles.id 
        AND pps.profile_visibility = 'followers'
      ) AND
      public.is_friends_with(auth.uid(), profiles.id)
    ) OR
    profiles.id = auth.uid()
  )
);

-- 8. Grant basic permissions
GRANT SELECT ON public.profiles_public_secure TO authenticated;
GRANT SELECT ON public.profiles_public TO authenticated;

-- 9. Add security comments
COMMENT ON VIEW public.profiles_public_secure IS 'Regular view for public profile data - uses RLS policies for security, no security_barrier';
COMMENT ON VIEW public.profiles_public IS 'Simple public view without security definer properties';

-- 10. Double-check: remove any security_barrier or security definer properties
-- This should address the linter warnings
ALTER VIEW public.profiles_public_secure RESET (security_barrier);
ALTER VIEW public.profiles_public RESET (security_barrier);
ALTER VIEW public.profiles_safe_public RESET (security_barrier);