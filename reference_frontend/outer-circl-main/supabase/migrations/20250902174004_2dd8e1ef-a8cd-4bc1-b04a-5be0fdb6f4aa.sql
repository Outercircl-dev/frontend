-- Fix ambiguous column references in trigger functions

-- Fix notify_activity_status_change function
CREATE OR REPLACE FUNCTION public.notify_activity_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_title TEXT;
  participant_count INTEGER;
BEGIN
  -- Only process when event status changes to 'completed'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Get event title with explicit table alias
    SELECT e.title INTO event_title
    FROM public.events e
    WHERE e.id = NEW.id;
    
    -- Get participant count with explicit table alias
    SELECT COUNT(*) INTO participant_count
    FROM public.event_participants ep
    WHERE ep.event_id = NEW.id AND ep.status = 'attending';
    
    -- Send notifications to all participants
    INSERT INTO public.notifications (
      user_id,
      title,
      content,
      notification_type,
      metadata
    )
    SELECT 
      ep.user_id,
      'Activity Completed',
      'Thank you for participating in "' || event_title || '"! Please rate your fellow participants.',
      'event',
      jsonb_build_object(
        'event_id', NEW.id,
        'event_title', event_title,
        'participant_count', participant_count
      )
    FROM public.event_participants ep
    WHERE ep.event_id = NEW.id AND ep.status = 'attending';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update send_immediate_event_notifications function to fix ambiguous references
CREATE OR REPLACE FUNCTION public.send_immediate_event_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update update_user_activity_history function to fix potential ambiguous references
CREATE OR REPLACE FUNCTION public.update_user_activity_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  participant_record RECORD;
BEGIN
  -- Only process when event status changes to 'completed'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Update activity history for all participants who attended
    FOR participant_record IN 
      SELECT ep.user_id
      FROM public.event_participants ep
      WHERE ep.event_id = NEW.id 
      AND ep.status = 'attending'
    LOOP
      -- Insert or update the user's activity history for this category
      INSERT INTO public.user_activity_history (user_id, category, activity_count, last_activity_date)
      VALUES (
        participant_record.user_id,
        COALESCE(NEW.category, 'other'),
        1,
        NEW.date
      )
      ON CONFLICT (user_id, category) 
      DO UPDATE SET 
        activity_count = user_activity_history.activity_count + 1,
        last_activity_date = GREATEST(user_activity_history.last_activity_date, NEW.date),
        updated_at = now();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;