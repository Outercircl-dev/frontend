-- Disable all problematic triggers temporarily
DROP TRIGGER IF EXISTS validate_event_trigger ON public.events;
DROP TRIGGER IF EXISTS send_post_event_rating_notifications ON public.events;

-- Update events directly without triggers
UPDATE public.events 
SET status = 'completed', updated_at = NOW()
WHERE status = 'active'
  AND date IS NOT NULL
  AND (
    -- Events with both date and time
    (time IS NOT NULL AND (date + time) < NOW()) OR
    -- Events with only date (consider completed if date has passed)
    (time IS NULL AND date < CURRENT_DATE)
  );

-- Re-enable the validation trigger
CREATE TRIGGER validate_event_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_data();

-- Re-enable the rating notification trigger  
CREATE TRIGGER send_post_event_rating_notifications
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.send_post_event_rating_notifications();