-- Create function to send immediate notifications for events confirmed within 24 hours
CREATE OR REPLACE FUNCTION public.send_immediate_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  event_datetime TIMESTAMP WITH TIME ZONE;
  hours_until_event NUMERIC;
BEGIN
  -- Only process when event status changes to 'active' or 'confirmed'
  IF (OLD.status IS NULL OR OLD.status != 'active') AND NEW.status = 'active' THEN
    -- Calculate event datetime
    IF NEW.date IS NOT NULL THEN
      event_datetime := NEW.date;
      
      IF NEW.time IS NOT NULL THEN
        event_datetime := NEW.date + NEW.time;
      ELSE
        event_datetime := NEW.date + TIME '12:00:00'; -- Default to noon if no time specified
      END IF;
      
      -- Calculate hours until event
      hours_until_event := EXTRACT(EPOCH FROM (event_datetime - NOW())) / 3600;
      
      -- If event is within 24 hours and in the future, send immediate notifications
      IF hours_until_event > 0 AND hours_until_event <= 24 THEN
        -- Log the action for debugging
        RAISE NOTICE 'Sending immediate notifications for event: % (hours until: %)', NEW.title, hours_until_event;
        
        -- Call the edge function to send immediate notifications
        PERFORM net.http_post(
          url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-immediate-notifications',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
          body := json_build_object('eventId', NEW.id)::jsonb
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for immediate notifications when events are confirmed
CREATE TRIGGER send_immediate_event_notifications_trigger
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.send_immediate_event_notifications();

-- Also create a manual function to trigger immediate notifications for existing events
CREATE OR REPLACE FUNCTION public.trigger_immediate_notifications_for_existing_events()
RETURNS INTEGER AS $$
DECLARE
  event_record RECORD;
  event_datetime TIMESTAMP WITH TIME ZONE;
  hours_until_event NUMERIC;
  notification_count INTEGER := 0;
BEGIN
  -- Find active events that are within 24 hours
  FOR event_record IN
    SELECT id, title, date, time, status
    FROM public.events
    WHERE status = 'active'
    AND date IS NOT NULL
    AND date >= CURRENT_DATE
    AND date <= CURRENT_DATE + INTERVAL '1 day'
  LOOP
    -- Calculate event datetime
    event_datetime := event_record.date;
    
    IF event_record.time IS NOT NULL THEN
      event_datetime := event_record.date + event_record.time;
    ELSE
      event_datetime := event_record.date + TIME '12:00:00';
    END IF;
    
    -- Calculate hours until event
    hours_until_event := EXTRACT(EPOCH FROM (event_datetime - NOW())) / 3600;
    
    -- If event is within 24 hours and in the future
    IF hours_until_event > 0 AND hours_until_event <= 24 THEN
      -- Call the edge function
      PERFORM net.http_post(
        url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-immediate-notifications',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
        body := json_build_object('eventId', event_record.id)::jsonb
      );
      
      notification_count := notification_count + 1;
      
      RAISE NOTICE 'Triggered immediate notification for event: % (ID: %)', event_record.title, event_record.id;
    END IF;
  END LOOP;
  
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;