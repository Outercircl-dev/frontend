-- Disable the validation trigger
DROP TRIGGER IF EXISTS validate_event_trigger ON public.events;

-- Run the auto-completion function to mark past events as completed
SELECT public.auto_complete_past_events();

-- Re-enable the validation trigger with the updated function
CREATE TRIGGER validate_event_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_data();