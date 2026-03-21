-- Set default banner_url for all users who don't have one
UPDATE public.profiles 
SET banner_url = 'https://bommnpdpzmvqufurwwik.supabase.co/storage/v1/object/public/activitystockimages/LogoAi-outer%20circl-Mockups5.jpg'
WHERE banner_url IS NULL OR banner_url = '';

-- Update the trigger to set default banner for new users
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
  
  -- Set default banner if not provided
  IF NEW.banner_url IS NULL OR NEW.banner_url = '' THEN
    NEW.banner_url := 'https://bommnpdpzmvqufurwwik.supabase.co/storage/v1/object/public/activitystockimages/LogoAi-outer%20circl-Mockups5.jpg';
  END IF;
  
  RETURN NEW;
END;
$function$;