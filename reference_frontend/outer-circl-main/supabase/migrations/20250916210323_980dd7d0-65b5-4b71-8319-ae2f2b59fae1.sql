-- Fix can_view_profile function to allow unauthenticated access to public profiles
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid, viewing_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_visibility_setting text;
  are_friends boolean := false;
BEGIN
  -- If viewing own profile, always allow (but only if authenticated)
  IF viewing_user_id IS NOT NULL AND profile_id = viewing_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the profile's visibility setting, default to 'public' if none exists
  SELECT COALESCE(pps.profile_visibility, 'public') INTO profile_visibility_setting
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = profile_id;
  
  -- If no privacy settings exist, default to public
  IF profile_visibility_setting IS NULL THEN
    profile_visibility_setting := 'public';
  END IF;
  
  -- If profile is public, allow access even for unauthenticated users
  IF profile_visibility_setting = 'public' THEN 
    RETURN true;
  END IF;
  
  -- For non-public profiles, user must be authenticated
  IF viewing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check friendship status for followers/private profiles
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = profile_id AND f.friend_id = viewing_user_id) OR
           (f.user_id = viewing_user_id AND f.friend_id = profile_id))
    AND f.status = 'accepted'
  ) INTO are_friends;
  
  -- Apply visibility rules for authenticated users
  IF profile_visibility_setting = 'followers' THEN 
    RETURN are_friends;
  ELSIF profile_visibility_setting = 'nobody' THEN 
    RETURN false;
  ELSE 
    -- Default to public for unknown settings
    RETURN true;
  END IF;
END;
$function$;

-- Update the profiles RLS policy to work with unauthenticated users
DROP POLICY IF EXISTS "profiles_select_with_permission" ON public.profiles;

CREATE POLICY "profiles_select_with_permission" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile (if authenticated)
  (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR 
  -- Allow viewing based on can_view_profile function (works for both authenticated and unauthenticated)
  can_view_profile(id, auth.uid())
);