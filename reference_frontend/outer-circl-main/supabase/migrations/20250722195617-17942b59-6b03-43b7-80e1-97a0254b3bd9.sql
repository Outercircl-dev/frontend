-- Drop and recreate the notifications constraint to include 'rating_request'
ALTER TABLE public.notifications 
DROP CONSTRAINT notifications_notification_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY['message'::text, 'event'::text, 'friend_request'::text, 'general'::text, 'system'::text, 'rating_request'::text]));

-- Temporarily disable the rating notification trigger to avoid constraint issues during auto-completion
DROP TRIGGER IF EXISTS send_post_event_rating_notifications_trigger ON public.events;

-- Run the auto-completion function to mark past events as completed
SELECT public.auto_complete_past_events();

-- Re-enable the rating notification trigger
CREATE TRIGGER send_post_event_rating_notifications_trigger
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.send_post_event_rating_notifications();