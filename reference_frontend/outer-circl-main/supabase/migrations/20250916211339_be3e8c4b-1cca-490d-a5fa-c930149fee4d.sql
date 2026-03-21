-- Drop the dependent policy first
DROP POLICY IF EXISTS "profiles_select_with_permission" ON public.profiles;

-- Now drop the function and recreate it with correct return type
DROP FUNCTION IF EXISTS public.can_view_profile(uuid, uuid);

CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid, viewing_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_visibility_setting text;
  are_friends boolean := false;
BEGIN
  -- Must be authenticated to view any profile
  IF viewing_user_id IS NULL THEN
    RETURN 'none';
  END IF;
  
  -- If viewing own profile, always allow full access
  IF profile_id = viewing_user_id THEN
    RETURN 'full';
  END IF;
  
  -- Get the profile's visibility setting, default to 'public' if none exists
  SELECT COALESCE(pps.profile_visibility, 'public') INTO profile_visibility_setting
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = profile_id;
  
  -- If no privacy settings exist, default to public
  IF profile_visibility_setting IS NULL THEN
    profile_visibility_setting := 'public';
  END IF;
  
  -- Check friendship status
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = profile_id AND f.friend_id = viewing_user_id) OR
           (f.user_id = viewing_user_id AND f.friend_id = profile_id))
    AND f.status = 'accepted'
  ) INTO are_friends;
  
  -- Apply visibility rules
  IF profile_visibility_setting = 'public' THEN 
    -- Public profiles: friends get full access, non-friends get limited
    IF are_friends THEN
      RETURN 'full';
    ELSE
      RETURN 'limited';
    END IF;
  ELSIF profile_visibility_setting = 'followers' THEN 
    -- Friends-only profiles: only friends can see, others get no access
    IF are_friends THEN
      RETURN 'full';
    ELSE
      RETURN 'none';
    END IF;
  ELSIF profile_visibility_setting = 'private' THEN 
    -- Private profiles: no one can see except owner
    RETURN 'none';
  ELSE 
    -- Default fallback
    RETURN 'limited';
  END IF;
END;
$function$;

-- Recreate the policy with the updated function
CREATE POLICY "profiles_select_with_permission" 
ON public.profiles 
FOR SELECT 
USING (
  -- Must be authenticated to view any profile
  auth.uid() IS NOT NULL AND (
    -- Users can always view their own profile
    auth.uid() = id
    OR 
    -- Allow viewing based on can_view_profile function (returns 'full', 'limited', or 'none')
    can_view_profile(id, auth.uid()) != 'none'
  )
);