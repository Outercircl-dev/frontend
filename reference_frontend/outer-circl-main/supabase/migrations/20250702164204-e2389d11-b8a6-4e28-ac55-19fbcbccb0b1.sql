-- Function to check if user allows ad personalization
CREATE OR REPLACE FUNCTION public.allows_ad_personalization(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(ad_personalization, true)
  FROM public.profile_privacy_settings
  WHERE user_id = allows_ad_personalization.user_id;
$$;

-- Function to get user's personalization preference
CREATE OR REPLACE FUNCTION public.get_personalization_level(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(personalization_opt, 'full')
  FROM public.profile_privacy_settings
  WHERE user_id = get_personalization_level.user_id;
$$;

-- Function to enforce notification delivery based on user preferences
CREATE OR REPLACE FUNCTION public.can_send_notification(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Check based on notification type
  CASE p_notification_type
    WHEN 'message' THEN
      -- Check if user wants push notifications
      RETURN wants_push_notifications(p_user_id);
    WHEN 'event' THEN
      -- Check if user wants event-related notifications
      RETURN wants_push_notifications(p_user_id) AND wants_event_messages(p_user_id);
    WHEN 'friend_request' THEN
      -- Check if user wants push notifications
      RETURN wants_push_notifications(p_user_id);
    ELSE
      -- For general notifications, check push notification setting
      RETURN wants_push_notifications(p_user_id);
  END CASE;
END;
$$;

-- Policy to prevent notifications from being inserted if user doesn't want them
CREATE POLICY "Respect user notification preferences"
ON public.notifications
FOR INSERT
WITH CHECK (can_send_notification(user_id, notification_type));

-- Function to check if user data can be used for analytics based on personalization setting
CREATE OR REPLACE FUNCTION public.can_use_for_analytics(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT get_personalization_level(p_user_id) != 'minimal';
$$;

-- Function to check if user allows recommendations
CREATE OR REPLACE FUNCTION public.can_show_recommendations(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT get_personalization_level(p_user_id) = 'full';
$$;

-- Function to validate app preference changes
CREATE OR REPLACE FUNCTION public.validate_app_preferences()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure personalization_opt is valid
  IF NEW.personalization_opt NOT IN ('full', 'limited', 'minimal') THEN
    RAISE EXCEPTION 'Invalid personalization option: %', NEW.personalization_opt;
  END IF;
  
  -- Ensure message_privacy is valid
  IF NEW.message_privacy NOT IN ('everyone', 'followers', 'nobody') THEN
    RAISE EXCEPTION 'Invalid message privacy option: %', NEW.message_privacy;
  END IF;
  
  -- If personalization is minimal, disable ad personalization
  IF NEW.personalization_opt = 'minimal' THEN
    NEW.ad_personalization := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add validation trigger to profile_privacy_settings
CREATE TRIGGER validate_privacy_settings
BEFORE INSERT OR UPDATE ON public.profile_privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_app_preferences();