-- Fix duplicate reminder scheduling by consolidating triggers and adding safety mechanisms

-- Step 1: Drop all triggers first (before dropping functions they depend on)
DROP TRIGGER IF EXISTS trigger_schedule_2h_reminder ON events;
DROP TRIGGER IF EXISTS welcome_message_trigger ON event_participants;
DROP TRIGGER IF EXISTS trigger_welcome_message_on_join ON event_participants;
DROP TRIGGER IF EXISTS trigger_new_recurring_event ON events;

-- Step 2: Now drop the functions
DROP FUNCTION IF EXISTS schedule_2h_reminder();
DROP FUNCTION IF EXISTS send_welcome_message_trigger();
DROP FUNCTION IF EXISTS public.send_welcome_message_on_join();
DROP FUNCTION IF EXISTS public.schedule_event_reminders(uuid);
DROP FUNCTION IF EXISTS public.handle_new_recurring_event();
DROP FUNCTION IF EXISTS public.cleanup_orphaned_reminders();

-- Step 3: Create send_welcome_message_on_join with idempotency check
CREATE FUNCTION public.send_welcome_message_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_record RECORD;
  reminder_exists BOOLEAN;
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status != 'attending' THEN
    RETURN NEW;
  END IF;

  -- Get event details
  SELECT id, title, date, time, host_id, description, location
  INTO event_record
  FROM events
  WHERE id = NEW.event_id;

  -- Check if reminders already exist for this event (idempotency check)
  SELECT EXISTS(
    SELECT 1 FROM scheduled_reminders 
    WHERE event_id = NEW.event_id
  ) INTO reminder_exists;

  -- Only schedule reminders if they don't exist yet
  IF NOT reminder_exists AND event_record.date IS NOT NULL THEN
    RAISE NOTICE 'Scheduling reminders for event % (first participant joined)', event_record.id;
    PERFORM schedule_event_reminders(event_record.id);
  ELSE
    RAISE NOTICE 'Skipping reminder scheduling for event % (already exist or no date)', event_record.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Create schedule_event_reminders with advisory locks and comprehensive error handling
CREATE FUNCTION public.schedule_event_reminders(p_event_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_record RECORD;
  event_datetime TIMESTAMP WITH TIME ZONE;
  reminder_24h TIMESTAMP WITH TIME ZONE;
  reminder_12h TIMESTAMP WITH TIME ZONE;
  reminder_2h TIMESTAMP WITH TIME ZONE;
  lock_key BIGINT;
BEGIN
  -- Create a lock key from the event_id to prevent concurrent scheduling
  lock_key := ('x' || substr(md5(p_event_id::text), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock for this event (automatically released at transaction end)
  PERFORM pg_advisory_xact_lock(lock_key);
  
  RAISE NOTICE 'Advisory lock acquired for event %', p_event_id;

  -- Get event details
  SELECT id, title, date, time, status
  INTO event_record
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND OR event_record.date IS NULL THEN
    RAISE NOTICE 'Event % not found or has no date, skipping reminder scheduling', p_event_id;
    RETURN;
  END IF;

  -- Calculate event datetime
  event_datetime := event_record.date;
  IF event_record.time IS NOT NULL THEN
    event_datetime := event_record.date + event_record.time;
  ELSE
    event_datetime := event_record.date + TIME '12:00:00';
  END IF;

  -- Calculate reminder times
  reminder_24h := event_datetime - INTERVAL '24 hours';
  reminder_12h := event_datetime - INTERVAL '12 hours';
  reminder_2h := event_datetime - INTERVAL '2 hours';

  -- Only schedule future reminders with existence checks and exception handling
  IF reminder_24h > NOW() THEN
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM scheduled_reminders WHERE event_id = p_event_id AND reminder_type = '24h') THEN
        INSERT INTO scheduled_reminders (event_id, reminder_type, scheduled_for)
        VALUES (p_event_id, '24h', reminder_24h);
        RAISE NOTICE 'Scheduled 24h reminder for event %', p_event_id;
      ELSE
        RAISE NOTICE '24h reminder already exists for event %', p_event_id;
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Caught unique_violation for 24h reminder on event %, already exists', p_event_id;
    END;
  END IF;

  IF reminder_12h > NOW() THEN
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM scheduled_reminders WHERE event_id = p_event_id AND reminder_type = '12h') THEN
        INSERT INTO scheduled_reminders (event_id, reminder_type, scheduled_for)
        VALUES (p_event_id, '12h', reminder_12h);
        RAISE NOTICE 'Scheduled 12h reminder for event %', p_event_id;
      ELSE
        RAISE NOTICE '12h reminder already exists for event %', p_event_id;
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Caught unique_violation for 12h reminder on event %, already exists', p_event_id;
    END;
  END IF;

  IF reminder_2h > NOW() THEN
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM scheduled_reminders WHERE event_id = p_event_id AND reminder_type = '2h') THEN
        INSERT INTO scheduled_reminders (event_id, reminder_type, scheduled_for)
        VALUES (p_event_id, '2h', reminder_2h);
        RAISE NOTICE 'Scheduled 2h reminder for event %', p_event_id;
      ELSE
        RAISE NOTICE '2h reminder already exists for event %', p_event_id;
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Caught unique_violation for 2h reminder on event %, already exists', p_event_id;
    END;
  END IF;

  RAISE NOTICE 'Completed reminder scheduling for event %', p_event_id;
END;
$$;

-- Step 5: Create handle_new_recurring_event to not trigger additional scheduling
CREATE FUNCTION public.handle_new_recurring_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process recurring events on INSERT
  IF TG_OP = 'INSERT' AND NEW.is_recurring = true AND NEW.parent_event_id IS NULL THEN
    -- Call the edge function to generate child events
    -- Let the normal flow handle reminder scheduling for each child
    PERFORM net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/manage-recurring-events',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
      body := json_build_object('action', 'generate', 'eventId', NEW.id)::jsonb
    );
    
    RAISE NOTICE 'Triggered recurring event generation for parent event %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 6: Recreate triggers
CREATE TRIGGER trigger_welcome_message_on_join
  AFTER INSERT OR UPDATE ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_message_on_join();

CREATE TRIGGER trigger_new_recurring_event
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_recurring_event();

-- Step 7: Add cleanup function for orphaned/duplicate reminders
CREATE FUNCTION public.cleanup_orphaned_reminders()
RETURNS TABLE(deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicates_deleted INTEGER := 0;
BEGIN
  -- Delete duplicate reminders, keeping only the oldest one for each (event_id, reminder_type)
  WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY event_id, reminder_type ORDER BY created_at ASC) as rn
    FROM scheduled_reminders
  )
  DELETE FROM scheduled_reminders
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
  
  GET DIAGNOSTICS duplicates_deleted = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % duplicate reminders', duplicates_deleted;
  
  RETURN QUERY SELECT duplicates_deleted;
END;
$$;

-- Run cleanup once to fix existing data
SELECT cleanup_orphaned_reminders();