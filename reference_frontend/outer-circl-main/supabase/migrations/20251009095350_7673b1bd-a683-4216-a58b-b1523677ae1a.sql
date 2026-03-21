-- Fix duplicate reminder scheduling for recurring events
-- Drop all existing versions of schedule_event_reminders function

DROP FUNCTION IF EXISTS schedule_event_reminders();
DROP FUNCTION IF EXISTS schedule_event_reminders(uuid);
DROP FUNCTION IF EXISTS schedule_event_reminders(p_event_id uuid);

-- Create new version with defensive checks and advisory locks
CREATE OR REPLACE FUNCTION schedule_event_reminders(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_record RECORD;
  event_datetime TIMESTAMP WITH TIME ZONE;
  reminder_count INTEGER := 0;
  reminder_24h TIMESTAMP WITH TIME ZONE;
  reminder_12h TIMESTAMP WITH TIME ZONE;
  reminder_2h TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Acquire advisory lock to prevent concurrent scheduling for same event
  PERFORM pg_advisory_xact_lock(hashtext(p_event_id::text));
  
  -- Check if reminders already exist for this event
  IF EXISTS (
    SELECT 1 FROM scheduled_reminders 
    WHERE event_id = p_event_id
  ) THEN
    RAISE NOTICE 'Reminders already exist for event %, skipping', p_event_id;
    RETURN 0;
  END IF;

  -- Get event details
  SELECT id, title, date, time, status INTO event_record
  FROM events
  WHERE id = p_event_id;

  -- Only schedule for active events with valid dates
  IF event_record.id IS NULL OR event_record.status != 'active' OR event_record.date IS NULL THEN
    RAISE NOTICE 'Event % not eligible for reminders (status: %, date: %)', 
      p_event_id, event_record.status, event_record.date;
    RETURN 0;
  END IF;

  -- Calculate event datetime
  event_datetime := event_record.date;
  IF event_record.time IS NOT NULL THEN
    event_datetime := event_record.date + event_record.time;
  ELSE
    event_datetime := event_record.date + TIME '12:00:00';
  END IF;

  -- Only schedule if event is in the future
  IF event_datetime <= NOW() THEN
    RAISE NOTICE 'Event % is in the past, skipping reminders', p_event_id;
    RETURN 0;
  END IF;

  -- Calculate reminder times
  reminder_24h := event_datetime - INTERVAL '24 hours';
  reminder_12h := event_datetime - INTERVAL '12 hours';
  reminder_2h := event_datetime - INTERVAL '2 hours';

  -- Schedule 24-hour reminder (if in future)
  IF reminder_24h > NOW() THEN
    BEGIN
      INSERT INTO scheduled_reminders (event_id, reminder_type, scheduled_for)
      VALUES (p_event_id, '24h', reminder_24h)
      ON CONFLICT (event_id, reminder_type) DO NOTHING;
      
      IF FOUND THEN
        reminder_count := reminder_count + 1;
        RAISE NOTICE 'Scheduled 24h reminder for event % at %', p_event_id, reminder_24h;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'Skipped 24h reminder (already exists) for event %', p_event_id;
    END;
  END IF;

  -- Schedule 12-hour reminder (if in future)
  IF reminder_12h > NOW() THEN
    BEGIN
      INSERT INTO scheduled_reminders (event_id, reminder_type, scheduled_for)
      VALUES (p_event_id, '12h', reminder_12h)
      ON CONFLICT (event_id, reminder_type) DO NOTHING;
      
      IF FOUND THEN
        reminder_count := reminder_count + 1;
        RAISE NOTICE 'Scheduled 12h reminder for event % at %', p_event_id, reminder_12h;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'Skipped 12h reminder (already exists) for event %', p_event_id;
    END;
  END IF;

  -- Schedule 2-hour reminder (if in future)
  IF reminder_2h > NOW() THEN
    BEGIN
      INSERT INTO scheduled_reminders (event_id, reminder_type, scheduled_for)
      VALUES (p_event_id, '2h', reminder_2h)
      ON CONFLICT (event_id, reminder_type) DO NOTHING;
      
      IF FOUND THEN
        reminder_count := reminder_count + 1;
        RAISE NOTICE 'Scheduled 2h reminder for event % at %', p_event_id, reminder_2h;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'Skipped 2h reminder (already exists) for event %', p_event_id;
    END;
  END IF;

  RAISE NOTICE 'Scheduled % reminders for event %', reminder_count, p_event_id;
  RETURN reminder_count;
END;
$$;

-- Update send_welcome_message_on_join with idempotency check
CREATE OR REPLACE FUNCTION send_welcome_message_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_record RECORD;
  host_name TEXT;
BEGIN
  IF NEW.status != 'attending' THEN
    RETURN NEW;
  END IF;

  SELECT e.id, e.title, e.host_id, p.name as host_name
  INTO event_record
  FROM events e
  JOIN profiles p ON p.id = e.host_id
  WHERE e.id = NEW.event_id;

  IF event_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id != event_record.host_id THEN
    INSERT INTO messages (sender_id, event_id, content, message_type)
    VALUES (
      event_record.host_id,
      NEW.event_id,
      '👋 Welcome to "' || event_record.title || '"! ' || 
      COALESCE(event_record.host_name, 'The host') || 
      ' is excited to have you join. Feel free to introduce yourself and ask any questions!',
      'event'
    );
  END IF;

  -- Only schedule if no reminders exist yet
  IF NOT EXISTS (
    SELECT 1 FROM scheduled_reminders 
    WHERE event_id = NEW.event_id
  ) THEN
    PERFORM schedule_event_reminders(NEW.event_id);
    RAISE NOTICE 'Triggered reminder scheduling for event %', NEW.event_id;
  ELSE
    RAISE NOTICE 'Reminders already scheduled for event %, skipping', NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Update create_recurring_events to schedule reminders for each child
CREATE OR REPLACE FUNCTION create_recurring_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_record RECORD;
  next_date DATE;
  occurrence_count INTEGER;
  created_count INTEGER := 0;
  max_future_months INTEGER := 6;
  user_membership_tier TEXT;
  max_occurrences INTEGER;
  new_event_id UUID;
BEGIN
  FOR event_record IN
    SELECT * FROM events
    WHERE is_recurring = TRUE
    AND parent_event_id IS NULL
    AND status = 'active'
    AND date >= CURRENT_DATE - INTERVAL '1 day'
  LOOP
    SELECT membership_tier INTO user_membership_tier
    FROM profiles WHERE id = event_record.host_id;
    
    IF user_membership_tier = 'premium' THEN
      max_occurrences := NULL;
    ELSE
      CASE event_record.recurrence_pattern
        WHEN 'weekly' THEN max_occurrences := 2;
        WHEN 'bi-weekly' THEN max_occurrences := 2;
        WHEN 'monthly' THEN max_occurrences := 1;
        WHEN 'custom' THEN
          IF event_record.recurrence_interval <= 7 THEN max_occurrences := 2;
          ELSIF event_record.recurrence_interval <= 14 THEN max_occurrences := 2;
          ELSE max_occurrences := 1;
          END IF;
        ELSE max_occurrences := 1;
      END CASE;
    END IF;
    
    CASE event_record.recurrence_pattern
      WHEN 'weekly' THEN next_date := event_record.date + INTERVAL '7 days';
      WHEN 'bi-weekly' THEN next_date := event_record.date + INTERVAL '14 days';
      WHEN 'monthly' THEN next_date := event_record.date + INTERVAL '1 month';
      WHEN 'custom' THEN next_date := event_record.date + (event_record.recurrence_interval || ' days')::INTERVAL;
      ELSE CONTINUE;
    END CASE;
    
    SELECT COUNT(*) INTO occurrence_count
    FROM events WHERE parent_event_id = event_record.id OR id = event_record.id;
    
    WHILE next_date <= CURRENT_DATE + (max_future_months || ' months')::INTERVAL
    LOOP
      IF max_occurrences IS NOT NULL AND occurrence_count >= max_occurrences THEN EXIT; END IF;
      IF event_record.recurrence_end_date IS NOT NULL AND next_date > event_record.recurrence_end_date THEN EXIT; END IF;
      IF event_record.recurrence_end_count IS NOT NULL AND occurrence_count >= event_record.recurrence_end_count THEN EXIT; END IF;
      
      IF NOT EXISTS (SELECT 1 FROM events WHERE parent_event_id = event_record.id AND date = next_date) THEN
        INSERT INTO events (
          title, description, location, date, time, duration, max_attendees, host_id, category, 
          image_url, coordinates, is_recurring, recurrence_pattern, recurrence_interval,
          recurrence_end_date, recurrence_end_count, parent_event_id, occurrence_number, 
          status, created_at, updated_at
        ) VALUES (
          event_record.title, event_record.description, event_record.location, next_date, 
          event_record.time, event_record.duration, event_record.max_attendees, event_record.host_id, 
          event_record.category, event_record.image_url, event_record.coordinates,
          FALSE, NULL, NULL, NULL, NULL, event_record.id, occurrence_count + 1, 
          'active', NOW(), NOW()
        ) RETURNING id INTO new_event_id;
        
        -- Schedule reminders for child event independently
        PERFORM schedule_event_reminders(new_event_id);
        
        created_count := created_count + 1;
        occurrence_count := occurrence_count + 1;
        RAISE NOTICE 'Created child event % with reminders', new_event_id;
      END IF;
      
      CASE event_record.recurrence_pattern
        WHEN 'weekly' THEN next_date := next_date + INTERVAL '7 days';
        WHEN 'bi-weekly' THEN next_date := next_date + INTERVAL '14 days';
        WHEN 'monthly' THEN next_date := next_date + INTERVAL '1 month';
        WHEN 'custom' THEN next_date := next_date + (event_record.recurrence_interval || ' days')::INTERVAL;
      END CASE;
    END LOOP;
  END LOOP;
  
  RETURN created_count;
END;
$$;

-- Add cleanup function for maintenance
CREATE OR REPLACE FUNCTION cleanup_orphaned_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM scheduled_reminders
  WHERE event_id NOT IN (SELECT id FROM events);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned reminders', deleted_count;
  RETURN deleted_count;
END;
$$;