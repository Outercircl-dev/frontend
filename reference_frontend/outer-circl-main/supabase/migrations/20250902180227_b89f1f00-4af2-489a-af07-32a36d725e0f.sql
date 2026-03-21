-- Fix ambiguous column reference by targeting the specific issue
-- Drop any problematic duplicate triggers first
DROP TRIGGER IF EXISTS send_post_event_rating_notifications_trigger ON public.events;

-- Check for any debug functions that might have ambiguous references
DROP FUNCTION IF EXISTS public.debug_message_access(uuid);

-- Recreate debug function with explicit table aliases
CREATE OR REPLACE FUNCTION public.debug_message_access(p_event_id uuid)
RETURNS TABLE(can_access boolean, is_participant boolean, is_host boolean, event_exists boolean, user_authenticated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = p_event_id AND ep.user_id = auth.uid() AND ep.status = 'attending') OR
      EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.host_id = auth.uid())
    ))::boolean,
    EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = p_event_id AND ep.user_id = auth.uid() AND ep.status = 'attending')::boolean,
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.host_id = auth.uid())::boolean,
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id)::boolean,
    (auth.uid() IS NOT NULL)::boolean;
END;
$function$;