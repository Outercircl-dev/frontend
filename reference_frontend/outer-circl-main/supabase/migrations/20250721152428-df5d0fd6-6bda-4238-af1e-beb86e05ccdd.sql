-- Function to automatically remove saved events for past activities the user didn't attend
CREATE OR REPLACE FUNCTION public.cleanup_unattended_saved_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  cleaned_count INTEGER := 0;
  saved_record RECORD;
  event_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find saved events for past activities where user didn't attend
  FOR saved_record IN
    SELECT 
      se.id as saved_id,
      se.user_id,
      se.event_id,
      e.date,
      e.time,
      e.status,
      e.title
    FROM public.saved_events se
    JOIN public.events e ON e.id = se.event_id
    WHERE e.status IN ('completed', 'active')
    AND e.date IS NOT NULL
  LOOP
    -- Calculate event datetime
    IF saved_record.time IS NOT NULL THEN
      event_datetime := saved_record.date + saved_record.time;
    ELSE
      event_datetime := saved_record.date + TIME '23:59:59'; -- End of day for date-only events
    END IF;
    
    -- Check if event is in the past
    IF event_datetime < NOW() THEN
      -- Check if user attended the event
      IF NOT EXISTS (
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = saved_record.event_id 
        AND ep.user_id = saved_record.user_id
        AND ep.status = 'attending'
      ) THEN
        -- User didn't attend, remove from saved
        DELETE FROM public.saved_events 
        WHERE id = saved_record.saved_id;
        
        cleaned_count := cleaned_count + 1;
        
        RAISE NOTICE 'Removed saved event "%" for user % (past event, did not attend)', 
                     saved_record.title, saved_record.user_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN cleaned_count;
END;
$function$

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
$function$

-- Create trigger to automatically cleanup saved events when events are completed
CREATE OR REPLACE TRIGGER cleanup_saved_events_on_completion
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_saved_events_cleanup();