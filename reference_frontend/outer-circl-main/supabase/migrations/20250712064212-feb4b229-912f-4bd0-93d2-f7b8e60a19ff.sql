-- Add account status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'deactivated'));

-- Add index for better search performance
CREATE INDEX idx_profiles_search ON public.profiles(name, username) WHERE account_status = 'active';

-- Update profile visibility function to respect deactivated accounts
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_owner_id uuid, viewer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  privacy_setting TEXT;
  is_friend BOOLEAN := false;
  has_permission BOOLEAN := false;
  owner_status TEXT;
BEGIN
  -- Check if profile owner's account is deactivated
  SELECT account_status INTO owner_status
  FROM public.profiles
  WHERE id = profile_owner_id;
  
  -- Don't allow viewing deactivated accounts unless it's the owner themselves
  IF owner_status = 'deactivated' AND profile_owner_id != viewer_id THEN
    RETURN false;
  END IF;
  
  -- Profile owner can always view their own profile
  IF profile_owner_id = viewer_id THEN
    RETURN true;
  END IF;
  
  -- Get privacy setting
  SELECT profile_visibility INTO privacy_setting
  FROM public.profile_privacy_settings
  WHERE user_id = profile_owner_id;
  
  -- Default to public if no setting exists
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

-- Create function to search users by name or username
CREATE OR REPLACE FUNCTION public.search_users(search_term text, requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  avatar_url text,
  bio text,
  friendship_status text
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name,
    p.username,
    p.avatar_url,
    p.bio,
    CASE 
      WHEN f.status IS NOT NULL THEN f.status
      WHEN f2.status IS NOT NULL THEN f2.status
      ELSE 'none'
    END as friendship_status
  FROM public.profiles p
  LEFT JOIN public.friendships f ON (
    (f.user_id = p.id AND f.friend_id = requesting_user_id) OR
    (f.user_id = requesting_user_id AND f.friend_id = p.id)
  )
  LEFT JOIN public.friendships f2 ON (
    (f2.user_id = requesting_user_id AND f2.friend_id = p.id) OR
    (f2.user_id = p.id AND f2.friend_id = requesting_user_id)
  )
  WHERE 
    p.account_status = 'active'
    AND p.id != requesting_user_id
    AND (
      LOWER(p.name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(p.username) LIKE LOWER('%' || search_term || '%')
    )
    AND can_view_profile(p.id, requesting_user_id)
  ORDER BY 
    CASE WHEN LOWER(p.username) = LOWER(search_term) THEN 1 ELSE 2 END,
    CASE WHEN LOWER(p.name) = LOWER(search_term) THEN 1 ELSE 2 END,
    p.name;
END;
$function$;