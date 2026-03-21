-- Create trigger to automatically cleanup saved events when events are completed
CREATE OR REPLACE TRIGGER cleanup_saved_events_on_completion
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_saved_events_cleanup();