-- Drop all check constraints on notifications table
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_check;

-- Add the correct constraint with all needed notification types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type IN ('general', 'friend_request', 'event', 'message', 'system', 'rating_request'));

-- Now run auto-completion
SELECT public.auto_complete_past_events();