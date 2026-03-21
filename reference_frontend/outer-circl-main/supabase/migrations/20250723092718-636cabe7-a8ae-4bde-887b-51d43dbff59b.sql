-- Update the existing notification function to integrate with MailerLite
CREATE OR REPLACE FUNCTION public.can_send_notification(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  email_notifications_enabled boolean := true;
  push_notifications_enabled boolean := true;
  event_messages_enabled boolean := true;
BEGIN
  -- Get user's notification preferences
  SELECT 
    COALESCE(email_notifications, true),
    COALESCE(push_notifications, true),
    COALESCE(event_messages, true)
  INTO 
    email_notifications_enabled,
    push_notifications_enabled,
    event_messages_enabled
  FROM public.profile_privacy_settings
  WHERE user_id = p_user_id;
  
  -- Check based on notification type
  CASE 
    WHEN p_notification_type IN ('event_reminder', 'event', 'rating_request') THEN
      RETURN event_messages_enabled;
    WHEN p_notification_type IN ('friend_request', 'message') THEN
      RETURN push_notifications_enabled;
    ELSE
      RETURN email_notifications_enabled;
  END CASE;
END;
$$;

-- Create a function to trigger MailerLite emails for important notifications
CREATE OR REPLACE FUNCTION public.send_mailerlite_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  should_send_email boolean := false;
BEGIN
  -- Only send emails for specific notification types
  IF NEW.notification_type IN ('event_reminder', 'rating_request', 'friend_request') THEN
    should_send_email := true;
  END IF;
  
  -- Skip if user has disabled email notifications
  IF NOT wants_email_notifications(NEW.user_id) THEN
    should_send_email := false;
  END IF;
  
  -- Send email notification via MailerLite edge function
  IF should_send_email THEN
    PERFORM net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-mailerlite-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
      body := json_build_object(
        'userId', NEW.user_id,
        'subject', NEW.title,
        'content', NEW.content,
        'notificationType', NEW.notification_type,
        'eventId', CASE 
          WHEN NEW.metadata ? 'event_id' THEN NEW.metadata->>'event_id'
          ELSE NULL
        END
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for MailerLite email notifications
DROP TRIGGER IF EXISTS send_mailerlite_notification ON public.notifications;
CREATE TRIGGER send_mailerlite_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_mailerlite_notification();