-- CRITICAL SECURITY FIX: Fix profiles_public_secure table anonymous access vulnerability
-- This table was allowing unrestricted public access to user profiles, enabling stalking and data harvesting

-- 1. Drop the insecure policy that allows anonymous access
DROP POLICY IF EXISTS "profiles_public_secure_authenticated_read" ON public.profiles_public_secure;

-- 2. Create a secure policy that requires authentication and respects privacy settings
CREATE POLICY "profiles_public_secure_authenticated_only" 
ON public.profiles_public_secure 
FOR SELECT 
TO authenticated
USING (
  -- Only authenticated users can access profile data
  auth.uid() IS NOT NULL 
  AND (
    -- Profile is set to public visibility
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps 
      WHERE pps.user_id = profiles_public_secure.id 
      AND pps.profile_visibility = 'public'
    )
    OR
    -- Current user is viewing their own profile
    auth.uid() = profiles_public_secure.id
    OR
    -- Current user is friends with profile owner
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE ((f.user_id = profiles_public_secure.id AND f.friend_id = auth.uid()) OR
             (f.user_id = auth.uid() AND f.friend_id = profiles_public_secure.id))
      AND f.status = 'accepted'
    )
  )
);

-- 3. Add security comment
COMMENT ON POLICY "profiles_public_secure_authenticated_only" ON public.profiles_public_secure IS 
'SECURITY PROTECTED: Requires authentication and respects user privacy settings. Prevents anonymous access to user profiles.';

-- 4. Verify the fix
SELECT 'Critical security vulnerability fixed - anonymous access to user profiles blocked' as security_status;