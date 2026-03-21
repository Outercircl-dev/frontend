-- Add messaging and notification settings to profile_privacy_settings table
ALTER TABLE public.profile_privacy_settings 
ADD COLUMN IF NOT EXISTS message_privacy TEXT DEFAULT 'everyone' CHECK (message_privacy IN ('everyone', 'followers', 'nobody')),
ADD COLUMN IF NOT EXISTS event_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS personalization_opt TEXT DEFAULT 'full' CHECK (personalization_opt IN ('full', 'limited', 'minimal')),
ADD COLUMN IF NOT EXISTS ad_personalization BOOLEAN DEFAULT true;

-- Create function to check if users can message each other based on privacy settings
CREATE OR REPLACE FUNCTION public.can_message_user(sender_id uuid, recipient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  recipient_privacy TEXT;
  are_friends BOOLEAN := false;
BEGIN
  -- Get recipient's message privacy setting
  SELECT message_privacy INTO recipient_privacy
  FROM public.profile_privacy_settings
  WHERE user_id = recipient_id;
  
  -- Default to 'everyone' if no setting exists
  IF recipient_privacy IS NULL THEN
    recipient_privacy := 'everyone';
  END IF;
  
  -- If privacy is set to 'everyone', allow messaging
  IF recipient_privacy = 'everyone' THEN
    RETURN true;
  END IF;
  
  -- If privacy is set to 'nobody', deny messaging
  IF recipient_privacy = 'nobody' THEN
    RETURN false;
  END IF;
  
  -- If privacy is set to 'followers', check if they are friends
  IF recipient_privacy = 'followers' THEN
    SELECT is_friends_with(sender_id, recipient_id) INTO are_friends;
    RETURN are_friends;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to check if user wants event messages
CREATE OR REPLACE FUNCTION public.wants_event_messages(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(event_messages, true)
  FROM public.profile_privacy_settings
  WHERE user_id = wants_event_messages.user_id;
$$;

-- Function to check if user wants push notifications
CREATE OR REPLACE FUNCTION public.wants_push_notifications(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(push_notifications, true)
  FROM public.profile_privacy_settings
  WHERE user_id = wants_push_notifications.user_id;
$$;

-- Function to check if user wants email notifications
CREATE OR REPLACE FUNCTION public.wants_email_notifications(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(email_notifications, true)
  FROM public.profile_privacy_settings
  WHERE user_id = wants_email_notifications.user_id;
$$;

-- Create a messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid,
  event_id uuid,
  content text NOT NULL,
  message_type text DEFAULT 'direct' CHECK (message_type IN ('direct', 'event')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages table that respect privacy settings
CREATE POLICY "Users can send direct messages if recipient allows"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  (
    -- Allow event messages if recipient wants them and sender is event participant
    (message_type = 'event' AND wants_event_messages(recipient_id) AND event_id IS NOT NULL) OR
    -- Allow direct messages based on privacy settings
    (message_type = 'direct' AND can_message_user(sender_id, recipient_id))
  )
);

CREATE POLICY "Users can view messages they sent"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Users can view messages sent to them"
ON public.messages
FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update read status on messages sent to them"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  notification_type text DEFAULT 'general' CHECK (notification_type IN ('message', 'event', 'friend_request', 'general')),
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Update trigger for messages
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();