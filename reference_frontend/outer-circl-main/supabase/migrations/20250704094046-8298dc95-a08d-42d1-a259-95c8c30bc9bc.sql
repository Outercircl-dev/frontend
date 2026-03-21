-- Create function to automatically mark past events as completed
CREATE OR REPLACE FUNCTION public.auto_complete_past_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  completed_count INTEGER := 0;
  event_record RECORD;
BEGIN
  -- Find events that should be marked as completed
  -- Events are considered past if their date + time is before now
  FOR event_record IN
    SELECT id, title, date, time, status
    FROM public.events
    WHERE status = 'active'
    AND date IS NOT NULL
    AND (
      -- Events with both date and time
      (time IS NOT NULL AND (date + time) < NOW()) OR
      -- Events with only date (consider completed if date has passed)
      (time IS NULL AND date < CURRENT_DATE)
    )
  LOOP
    -- Mark the event as completed
    UPDATE public.events
    SET status = 'completed', updated_at = NOW()
    WHERE id = event_record.id;
    
    completed_count := completed_count + 1;
    
    -- Log the completion for debugging
    RAISE NOTICE 'Auto-completed event: % (ID: %)', event_record.title, event_record.id;
  END LOOP;
  
  RETURN completed_count;
END;
$$;

-- Create a function to schedule the auto-completion job
-- This will run every hour to check for events that should be completed
SELECT cron.schedule(
  'auto-complete-events',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT public.auto_complete_past_events();
  $$
);

-- Also create a function to manually trigger the auto-completion
-- This can be useful for testing or immediate updates
CREATE OR REPLACE FUNCTION public.trigger_auto_complete_events()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  completed_count INTEGER;
BEGIN
  SELECT public.auto_complete_past_events() INTO completed_count;
  
  RETURN 'Completed ' || completed_count || ' past events';
END;
$$;