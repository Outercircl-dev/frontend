-- Create a trigger to automatically send welcome messages when users join events
CREATE OR REPLACE FUNCTION public.send_welcome_message_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  event_record RECORD;
  participant_record RECORD;
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status = 'attending' AND (OLD IS NULL OR OLD.status != 'attending') THEN
    -- Get event details
    SELECT * INTO event_record
    FROM public.events 
    WHERE id = NEW.event_id;
    
    -- Get participant details
    SELECT * INTO participant_record
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Call the welcome message edge function asynchronously
    PERFORM net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-welcome-message',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
      body := json_build_object(
        'eventId', NEW.event_id,
        'participantId', NEW.user_id
      )::jsonb
    );
    
    RAISE NOTICE 'Welcome message triggered for participant % joining event %', 
      participant_record.name, event_record.title;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for sending welcome messages
DROP TRIGGER IF EXISTS welcome_message_trigger ON public.event_participants;
CREATE TRIGGER welcome_message_trigger
  AFTER INSERT OR UPDATE ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message_trigger();

-- Create function to schedule enhanced reminders
CREATE OR REPLACE FUNCTION public.schedule_event_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  event_record RECORD;
  reminder_count INTEGER := 0;
  event_datetime TIMESTAMP WITH TIME ZONE;
  hours_until_event NUMERIC;
BEGIN
  -- Find events that need reminders
  FOR event_record IN
    SELECT id, title, date, time, status, host_id
    FROM public.events
    WHERE status = 'active'
    AND date IS NOT NULL
    AND date >= CURRENT_DATE
    AND date <= CURRENT_DATE + INTERVAL '2 days'
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
    
    -- Send appropriate reminders based on timing
    IF hours_until_event <= 26 AND hours_until_event > 22 THEN
      -- Send 24h reminder
      PERFORM net.http_post(
        url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-enhanced-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
        body := json_build_object(
          'eventId', event_record.id,
          'reminderType', '24h'
        )::jsonb
      );
      reminder_count := reminder_count + 1;
      
    ELSIF hours_until_event <= 14 AND hours_until_event > 10 THEN
      -- Send 12h reminder
      PERFORM net.http_post(
        url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-enhanced-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
        body := json_build_object(
          'eventId', event_record.id,
          'reminderType', '12h'
        )::jsonb
      );
      reminder_count := reminder_count + 1;
      
    ELSIF hours_until_event <= 3 AND hours_until_event > 1 THEN
      -- Send 2h reminder
      PERFORM net.http_post(
        url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-enhanced-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
        body := json_build_object(
          'eventId', event_record.id,
          'reminderType', '2h'
        )::jsonb
      );
      reminder_count := reminder_count + 1;
    END IF;
    
  END LOOP;
  
  RETURN reminder_count;
END;
$function$;