-- Add RLS policy to allow event participants to mark event messages as read
CREATE POLICY "Event participants can mark event messages as read" 
ON public.messages 
FOR UPDATE 
USING (
  message_type = 'event' 
  AND event_id IS NOT NULL 
  AND recipient_id IS NULL 
  AND (
    -- User is event participant
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = messages.event_id 
      AND ep.user_id = auth.uid() 
      AND ep.status = 'attending'
    ) OR
    -- User is event host
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = messages.event_id 
      AND e.host_id = auth.uid()
    )
  )
);

-- Create security definer function to safely update event message read status
CREATE OR REPLACE FUNCTION public.mark_event_message_as_read(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_record RECORD;
BEGIN
  -- Get message details
  SELECT * INTO message_record
  FROM public.messages
  WHERE id = p_message_id
  AND message_type = 'event'
  AND event_id IS NOT NULL
  AND recipient_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user can mark this message as read (participant or host)
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = message_record.event_id 
      AND ep.user_id = auth.uid() 
      AND ep.status = 'attending'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = message_record.event_id 
      AND e.host_id = auth.uid()
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Update the message read status
  UPDATE public.messages
  SET read_at = now(), updated_at = now()
  WHERE id = p_message_id;
  
  RETURN TRUE;
END;
$$;