-- Update the can_view_profile function to always allow public profile viewing
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_owner_id uuid, viewer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  privacy_setting TEXT;
  is_friend BOOLEAN := false;
  has_permission BOOLEAN := false;
BEGIN
  -- Profile owner can always view their own profile
  IF profile_owner_id = viewer_id THEN
    RETURN true;
  END IF;
  
  -- Get privacy setting
  SELECT profile_visibility INTO privacy_setting
  FROM public.profile_privacy_settings
  WHERE user_id = profile_owner_id;
  
  -- Default to public if no setting exists (since we changed the default)
  IF privacy_setting IS NULL THEN
    privacy_setting := 'public';
  END IF;
  
  -- If profile is public, allow access
  IF privacy_setting = 'public' THEN
    RETURN true;
  END IF;
  
  -- Check if they are friends
  SELECT EXISTS(
    SELECT 1 FROM public.friendships 
    WHERE ((user_id = profile_owner_id AND friend_id = viewer_id) 
           OR (user_id = viewer_id AND friend_id = profile_owner_id))
    AND status = 'accepted'
  ) INTO is_friend;
  
  -- If privacy is friends and they are friends, allow access
  IF privacy_setting = 'friends' AND is_friend THEN
    RETURN true;
  END IF;
  
  -- Check for explicit permission
  SELECT permission_granted INTO has_permission
  FROM public.profile_view_permissions
  WHERE profile_owner_id = can_view_profile.profile_owner_id 
    AND viewer_id = can_view_profile.viewer_id;
  
  RETURN COALESCE(has_permission, false);
END;
$function$;

-- Update RLS policy for friendships to always allow friend requests regardless of privacy settings
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.friendships;

CREATE POLICY "Users can create friendship requests" 
ON public.friendships 
FOR INSERT 
WITH CHECK (
  (auth.uid() = requested_by) AND 
  ((auth.uid() = user_id) OR (auth.uid() = friend_id)) AND
  -- Remove the privacy check - anyone can send friend requests now
  (auth.uid() <> user_id OR auth.uid() <> friend_id) -- prevent self-friendship
);