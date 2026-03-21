-- Create batch mark-as-read function for performance optimization
CREATE OR REPLACE FUNCTION mark_messages_as_read_batch(
  p_message_ids UUID[],
  p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, marked_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marked_count INTEGER := 0;
  v_message_id UUID;
BEGIN
  -- Validate user is authenticated
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Mark direct messages where user is recipient
  UPDATE messages
  SET read_at = NOW()
  WHERE id = ANY(p_message_ids)
    AND recipient_id = p_user_id
    AND read_at IS NULL
    AND message_type = 'direct';
  
  GET DIAGNOSTICS v_marked_count = ROW_COUNT;

  -- Mark event messages where user is a participant
  FOR v_message_id IN 
    SELECT unnest(p_message_ids)
  LOOP
    -- Check if user is participant in the event
    IF EXISTS (
      SELECT 1 FROM messages m
      INNER JOIN event_participants ep ON ep.event_id = m.event_id
      WHERE m.id = v_message_id
        AND ep.user_id = p_user_id
        AND m.message_type = 'event'
        AND m.read_at IS NULL
    ) THEN
      UPDATE messages
      SET read_at = NOW()
      WHERE id = v_message_id;
      
      v_marked_count := v_marked_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT TRUE, v_marked_count;
END;
$$;

-- Add performance indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread 
ON messages(recipient_id, read_at) 
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_event_created 
ON messages(event_id, created_at DESC) 
WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, read_at) 
WHERE read_at IS NULL;

-- Add comment for documentation
COMMENT ON FUNCTION mark_messages_as_read_batch IS 
'Efficiently marks multiple messages as read in batch. Handles both direct messages and event messages with proper permission checks.';