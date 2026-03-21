-- Update the RLS policy for messages to allow event messages without recipient
DROP POLICY IF EXISTS "Authenticated users can send messages if recipient allows" ON public.messages;

CREATE POLICY "Authenticated users can send messages if recipient allows" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  (auth.uid() = sender_id) AND 
  (
    -- Event messages (discussion board) - no recipient required
    (message_type = 'event' AND event_id IS NOT NULL) OR
    -- Direct messages - require recipient and permission check
    (message_type = 'direct' AND recipient_id IS NOT NULL AND can_message_user(sender_id, recipient_id))
  )
);