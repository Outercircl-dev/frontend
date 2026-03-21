-- Add RLS policy to allow event participants to view event messages
CREATE POLICY "Event participants can view event messages" 
ON public.messages 
FOR SELECT 
USING (
  message_type = 'event' 
  AND event_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = messages.event_id 
    AND ep.user_id = auth.uid()
    AND ep.status = 'attending'
  )
);