-- Create a trigger function to run cleanup when events are marked as completed
CREATE OR REPLACE FUNCTION public.trigger_saved_events_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Run cleanup when event status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM public.cleanup_unattended_saved_events();
  END IF;
  
  RETURN NEW;
END;
$function$;