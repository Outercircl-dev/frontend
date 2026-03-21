-- Fix infinite recursion in event_participants RLS policy
-- The current policy references event_participants within itself, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Event participants and hosts can view participants" ON public.event_participants;

-- Create a new policy that avoids self-reference
CREATE POLICY "Event participants and hosts can view participants" 
ON public.event_participants 
FOR SELECT 
USING (
  -- User is the host of the event
  (EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_participants.event_id 
    AND e.host_id = auth.uid()
  )) 
  OR 
  -- User is a participant in this specific event (direct check without subquery)
  (event_participants.user_id = auth.uid() AND event_participants.status = 'attending')
);