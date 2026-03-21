-- Fix user_can_view_event function to remove INSERT operations during SELECT
-- This function is used in RLS policies and cannot perform INSERT operations

CREATE OR REPLACE FUNCTION public.user_can_view_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- User must be authenticated
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Allow access only if user has legitimate relationship to event
  RETURN (
    -- User is the event host
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = p_event_id AND e.host_id = p_user_id
    ) OR
    -- User is a confirmed participant
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = p_event_id 
      AND ep.user_id = p_user_id 
      AND ep.status = 'attending'
    ) OR
    -- User is an invited participant (can see event details to decide)
    EXISTS (
      SELECT 1 FROM public.event_invitations ei
      WHERE ei.event_id = p_event_id 
      AND ei.invited_user_id = p_user_id 
      AND ei.status = 'pending'
    ) OR
    -- User has saved the event (legitimate interest)
    EXISTS (
      SELECT 1 FROM public.saved_events se
      WHERE se.event_id = p_event_id AND se.user_id = p_user_id
    ) OR
    -- Allow viewing active events (for dashboard display)
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = p_event_id 
      AND e.status = 'active' 
      AND e.date >= CURRENT_DATE
    )
  );
END;
$function$;