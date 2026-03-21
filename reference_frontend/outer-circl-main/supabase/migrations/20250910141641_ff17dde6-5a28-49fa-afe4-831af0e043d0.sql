-- Fix remaining function search path issues (simplified approach)

-- Update the cleanup_unattended_saved_events function if it exists
CREATE OR REPLACE FUNCTION public.cleanup_unattended_saved_events()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Remove saved events for events that are completed but user didn't attend
  DELETE FROM public.saved_events se
  WHERE EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = se.event_id
    AND e.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = e.id 
      AND ep.user_id = se.user_id 
      AND ep.status = 'attending'
    )
  );
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Success message
SELECT 'Function search path issues resolved' AS status;