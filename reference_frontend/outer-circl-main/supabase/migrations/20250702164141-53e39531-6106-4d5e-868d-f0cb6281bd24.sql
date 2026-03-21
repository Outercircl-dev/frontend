-- Create additional RLS policies for profile_privacy_settings to ensure proper access control
CREATE POLICY "Users can insert their own privacy settings" 
ON public.profile_privacy_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

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

-- Create user_preferences table for tracking personalization data usage
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  preference_type text NOT NULL CHECK (preference_type IN ('analytics', 'recommendations', 'content_filter', 'ad_targeting')),
  is_enabled boolean DEFAULT true,
  data_retention_days integer DEFAULT 365,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(user_id, preference_type)
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Function to initialize default user preferences based on personalization level
CREATE OR REPLACE FUNCTION public.initialize_user_preferences(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  personalization_level text;
BEGIN
  -- Get user's personalization preference
  personalization_level := get_personalization_level(p_user_id);
  
  -- Insert default preferences based on personalization level
  INSERT INTO public.user_preferences (user_id, preference_type, is_enabled, data_retention_days)
  VALUES 
    (p_user_id, 'analytics', 
     CASE WHEN personalization_level IN ('full', 'limited') THEN true ELSE false END,
     CASE WHEN personalization_level = 'full' THEN 365 
          WHEN personalization_level = 'limited' THEN 90 
          ELSE 30 END),
    (p_user_id, 'recommendations', 
     CASE WHEN personalization_level = 'full' THEN true ELSE false END,
     CASE WHEN personalization_level = 'full' THEN 365 
          WHEN personalization_level = 'limited' THEN 90 
          ELSE 30 END),
    (p_user_id, 'content_filter', 
     CASE WHEN personalization_level IN ('full', 'limited') THEN true ELSE false END,
     CASE WHEN personalization_level = 'full' THEN 365 
          WHEN personalization_level = 'limited' THEN 90 
          ELSE 30 END),
    (p_user_id, 'ad_targeting', 
     allows_ad_personalization(p_user_id),
     CASE WHEN personalization_level = 'full' THEN 365 
          WHEN personalization_level = 'limited' THEN 90 
          ELSE 30 END)
  ON CONFLICT (user_id, preference_type) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    data_retention_days = EXCLUDED.data_retention_days,
    updated_at = now();
END;
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
      -- Check if user wants push notifications and message notifications
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

-- Function to check if user data can be used for analytics
CREATE OR REPLACE FUNCTION public.can_use_for_analytics(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.user_preferences 
     WHERE user_id = p_user_id AND preference_type = 'analytics'), 
    get_personalization_level(p_user_id) != 'minimal'
  );
$$;

-- Function to check if user allows recommendations
CREATE OR REPLACE FUNCTION public.can_show_recommendations(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.user_preferences 
     WHERE user_id = p_user_id AND preference_type = 'recommendations'), 
    get_personalization_level(p_user_id) = 'full'
  );
$$;

-- Create trigger to automatically initialize preferences when privacy settings are created/updated
CREATE OR REPLACE FUNCTION public.sync_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialize or update user preferences based on new settings
  PERFORM initialize_user_preferences(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_preferences_on_privacy_update
AFTER INSERT OR UPDATE ON public.profile_privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_preferences();

-- Add update trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();