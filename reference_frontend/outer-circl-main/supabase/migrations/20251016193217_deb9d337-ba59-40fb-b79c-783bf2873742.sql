-- Phase 2: Strengthen Event Message RLS Policy
-- Ensure only verified, active participants can send event messages

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can send messages with proper access" ON public.messages;

-- Create stricter policy with explicit checks
CREATE POLICY "event_messages_require_active_participation_v2"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL AND
  auth.uid() = sender_id AND
  
  -- For event messages
  (
    message_type = 'event' AND
    event_id IS NOT NULL AND
    recipient_id IS NULL AND
    
    -- Must be an active participant OR the host
    (
      -- Active participant check
      EXISTS (
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = messages.event_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'attending'
      )
      OR
      -- Event host check
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = messages.event_id
        AND e.host_id = auth.uid()
        AND e.status = 'active'  -- Only active events
      )
    )
  )
  OR
  -- For direct messages (existing logic)
  (
    message_type = 'direct' AND
    recipient_id IS NOT NULL AND
    event_id IS NULL AND
    can_message_user(sender_id, recipient_id)
  )
);

-- Add comment for audit trail
COMMENT ON POLICY "event_messages_require_active_participation_v2" ON public.messages IS 
  'Strengthened policy: Only active event participants or hosts can send event messages. Direct messages require friendship.';