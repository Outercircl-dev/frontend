-- Fix trigger functions that incorrectly reference NEW.event_id on events table
-- For events table triggers, the column is NEW.id, not NEW.event_id

-- Fix notify_event_participants function
DROP FUNCTION IF EXISTS public.notify_event_participants();
CREATE OR REPLACE FUNCTION public.notify_event_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_record RECORD;
  participant_record RECORD;
  new_participant_name TEXT;
  target_event_id UUID;
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status != 'attending' THEN
    RETURN NEW;
  END IF;

  -- Store event_id in a variable to avoid ambiguity
  -- For event_participants table, use NEW.event_id
  target_event_id := NEW.event_id;

  -- Get event details
  SELECT title, host_id INTO event_record
  FROM public.events 
  WHERE id = target_event_id;

  -- Get new participant name
  SELECT name INTO new_participant_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notify the event host (if different from the new participant)
  IF event_record.host_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      event_record.host_id,
      'New Participant Joined Your Event',
      COALESCE(new_participant_name, 'Someone') || ' joined your event "' || event_record.title || '"',
      'event',
      jsonb_build_object(
        'event_id', target_event_id,
        'participant_id', NEW.user_id
      )
    );
  END IF;

  -- Notify all other participants (excluding the new participant and host)
  FOR participant_record IN 
    SELECT DISTINCT ep.user_id
    FROM public.event_participants ep
    WHERE ep.event_id = target_event_id
    AND ep.status = 'attending'
    AND ep.user_id != NEW.user_id -- Exclude the new participant
    AND ep.user_id != event_record.host_id -- Exclude host (already notified above)
  LOOP
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      participant_record.user_id,
      'New Participant Joined Event',
      COALESCE(new_participant_name, 'Someone') || ' joined "' || event_record.title || '"',
      'event',
      jsonb_build_object(
        'event_id', target_event_id,
        'participant_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Fix notify_saved_event_participants function  
DROP FUNCTION IF EXISTS public.notify_saved_event_participants();
CREATE OR REPLACE FUNCTION public.notify_saved_event_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_record RECORD;
  saved_user_record RECORD;
  new_participant_name TEXT;
  target_event_id UUID;
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status != 'attending' THEN
    RETURN NEW;
  END IF;

  -- Store event_id in a variable to avoid ambiguity
  -- For event_participants table, use NEW.event_id
  target_event_id := NEW.event_id;

  -- Get event details
  SELECT title INTO event_record
  FROM public.events 
  WHERE id = target_event_id;

  -- Get new participant name
  SELECT name INTO new_participant_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notify all users who have saved this event (excluding the new participant)
  FOR saved_user_record IN 
    SELECT DISTINCT se.user_id
    FROM public.saved_events se
    WHERE se.event_id = target_event_id
    AND se.user_id != NEW.user_id -- Exclude the new participant
  LOOP
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      saved_user_record.user_id,
      'New Participant in Saved Event',
      COALESCE(new_participant_name, 'Someone') || ' joined "' || event_record.title || '" that you saved',
      'event',
      jsonb_build_object(
        'event_id', target_event_id,
        'participant_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Fix track_activity_participation function
DROP FUNCTION IF EXISTS public.track_activity_participation();
CREATE OR REPLACE FUNCTION public.track_activity_participation()
RETURNS trigger
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status = 'attending' AND (OLD IS NULL OR OLD.status != 'attending') THEN
    -- Get event details and insert/update activity history
    INSERT INTO public.user_activity_history (user_id, category, activity_count, last_activity_date)
    SELECT 
      NEW.user_id,
      COALESCE(e.category, 'other'),
      1,
      e.date
    FROM public.events e
    WHERE e.id = NEW.event_id
    ON CONFLICT (user_id, category) 
    DO UPDATE SET 
      activity_count = activity_count + 1,
      last_activity_date = GREATEST(last_activity_date, EXCLUDED.last_activity_date),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;