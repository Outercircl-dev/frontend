-- Update messages RLS policy to restrict event message sending to attendees only

-- Drop the existing INSERT policy for messages
DROP POLICY IF EXISTS "Authenticated users can send messages if recipient allows" ON messages;

-- Create new INSERT policy that restricts event messages to attending participants and hosts
CREATE POLICY "Users can send messages with proper access"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  (auth.uid() = sender_id) AND 
  (
    -- For event messages: must be attending participant or host
    (
      (message_type = 'event'::text) AND 
      (event_id IS NOT NULL) AND
      (
        EXISTS (
          SELECT 1 FROM event_participants ep
          WHERE ep.event_id = messages.event_id 
          AND ep.user_id = auth.uid() 
          AND ep.status = 'attending'
        ) OR
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = messages.event_id 
          AND e.host_id = auth.uid()
        )
      )
    ) OR
    -- For direct messages: recipient must allow messages
    (
      (message_type = 'direct'::text) AND 
      (recipient_id IS NOT NULL) AND 
      can_message_user(sender_id, recipient_id)
    )
  )
);