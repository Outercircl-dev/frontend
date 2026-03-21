-- Create scheduled reminders for 2-hour notifications
CREATE OR REPLACE FUNCTION schedule_2h_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reminder_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only schedule for new active events with valid dates/times
  IF TG_OP = 'INSERT' AND NEW.status = 'active' AND NEW.date IS NOT NULL THEN
    -- Calculate 2 hours before event
    IF NEW.time IS NOT NULL THEN
      reminder_time := (NEW.date + NEW.time) - INTERVAL '2 hours';
    ELSE
      -- Default to 10 AM if no time specified
      reminder_time := NEW.date + TIME '10:00:00' - INTERVAL '2 hours';
    END IF;
    
    -- Only schedule if reminder time is in the future
    IF reminder_time > NOW() THEN
      INSERT INTO public.scheduled_reminders (
        event_id,
        reminder_type,
        scheduled_for
      ) VALUES (
        NEW.id,
        '2h',
        reminder_time
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for scheduling 2-hour reminders
DROP TRIGGER IF EXISTS trigger_schedule_2h_reminder ON public.events;
CREATE TRIGGER trigger_schedule_2h_reminder
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION schedule_2h_reminder();