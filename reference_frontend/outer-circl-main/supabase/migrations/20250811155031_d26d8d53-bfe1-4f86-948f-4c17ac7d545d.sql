-- Fix the can_view_profile function with proper logic
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
  -- If viewing own profile, always allow
  IF profile_id = viewing_user_id THEN
    RETURN true;
  END IF;
  
  -- If not authenticated, deny access
  IF viewing_user_id IS NULL THEN
    RETURN false;
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
    RETURN true;
  ELSIF profile_visibility_setting = 'followers' THEN 
    RETURN are_friends;
  ELSIF profile_visibility_setting = 'nobody' THEN 
    RETURN false;
  ELSE 
    -- Default to public for unknown settings
    RETURN true;
  END IF;
END;
$function$;

-- Create function to ensure default privacy settings
CREATE OR REPLACE FUNCTION public.ensure_default_privacy_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default privacy settings for new users
  INSERT INTO public.profile_privacy_settings (
    user_id,
    profile_visibility,
    allow_friend_requests,
    message_privacy,
    email_notifications,
    push_notifications,
    event_messages,
    ad_personalization,
    personalization_opt
  ) VALUES (
    NEW.id,
    'public',
    true,
    'followers',
    true,
    true,
    true,
    true,
    'full'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to ensure default privacy settings for new profiles
DROP TRIGGER IF EXISTS ensure_privacy_settings ON public.profiles;
CREATE TRIGGER ensure_privacy_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_privacy_settings();

-- Ensure existing users without privacy settings get defaults
INSERT INTO public.profile_privacy_settings (
  user_id,
  profile_visibility,
  allow_friend_requests,
  message_privacy,
  email_notifications,
  push_notifications,
  event_messages,
  ad_personalization,
  personalization_opt
)
SELECT 
  p.id,
  'public',
  true,
  'followers',
  true,
  true,
  true,
  true,
  'full'
FROM public.profiles p
LEFT JOIN public.profile_privacy_settings pps ON p.id = pps.user_id
WHERE pps.user_id IS NULL;