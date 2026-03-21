-- Update notification type constraint to include missing types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type IN ('general', 'friend_request', 'event', 'message', 'system', 'rating_request', 'event_reminder'));