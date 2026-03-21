-- Fix recurring events creation to respect membership limits
-- Standard membership: 2 weeks only (original + 1 occurrence for weekly)
-- Premium membership: unlimited (up to 6 months)

CREATE OR REPLACE FUNCTION public.create_recurring_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  event_record RECORD;
  next_date DATE;
  occurrence_count INTEGER;
  created_count INTEGER := 0;
  max_future_months INTEGER := 6;
  user_membership_tier TEXT;
  max_occurrences INTEGER;
BEGIN
  -- Find recurring events that need new instances created
  FOR event_record IN
    SELECT *
    FROM public.events
    WHERE is_recurring = TRUE
    AND parent_event_id IS NULL -- Only process parent events
    AND status = 'active'
    AND date >= CURRENT_DATE - INTERVAL '1 day' -- Only process current/future events
  LOOP
    -- Get user's membership tier
    SELECT membership_tier INTO user_membership_tier
    FROM public.profiles
    WHERE id = event_record.host_id;
    
    -- Set limits based on membership tier
    IF user_membership_tier = 'premium' THEN
      max_occurrences := NULL; -- Unlimited for premium
    ELSE
      -- Standard membership: limit to 2 weeks
      CASE event_record.recurrence_pattern
        WHEN 'weekly' THEN
          max_occurrences := 2; -- Original + 1 week = 2 total
        WHEN 'bi-weekly' THEN
          max_occurrences := 2; -- Original + 2 weeks = 2 total  
        WHEN 'monthly' THEN
          max_occurrences := 1; -- Only original event for monthly
        WHEN 'custom' THEN
          -- For custom, calculate based on interval
          IF event_record.recurrence_interval <= 7 THEN
            max_occurrences := 2; -- Weekly or more frequent
          ELSIF event_record.recurrence_interval <= 14 THEN
            max_occurrences := 2; -- Bi-weekly
          ELSE
            max_occurrences := 1; -- Monthly or less frequent
          END IF;
        ELSE
          max_occurrences := 1; -- Default to 1 for unknown patterns
      END CASE;
    END IF;
    
    -- Calculate next occurrence date
    CASE event_record.recurrence_pattern
      WHEN 'weekly' THEN
        next_date := event_record.date + INTERVAL '7 days';
      WHEN 'bi-weekly' THEN
        next_date := event_record.date + INTERVAL '14 days';
      WHEN 'monthly' THEN
        next_date := event_record.date + INTERVAL '1 month';
      WHEN 'custom' THEN
        next_date := event_record.date + (event_record.recurrence_interval || ' days')::INTERVAL;
      ELSE
        CONTINUE; -- Skip unknown patterns
    END CASE;
    
    -- Count existing occurrences
    SELECT COUNT(*) INTO occurrence_count
    FROM public.events
    WHERE parent_event_id = event_record.id OR id = event_record.id;
    
    -- Check if we should create more occurrences
    WHILE next_date <= CURRENT_DATE + (max_future_months || ' months')::INTERVAL
    LOOP
      -- Check membership-based limits for standard users
      IF max_occurrences IS NOT NULL AND occurrence_count >= max_occurrences THEN
        EXIT;
      END IF;
      
      -- Check end conditions
      IF event_record.recurrence_end_date IS NOT NULL AND next_date > event_record.recurrence_end_date THEN
        EXIT;
      END IF;
      
      IF event_record.recurrence_end_count IS NOT NULL AND occurrence_count >= event_record.recurrence_end_count THEN
        EXIT;
      END IF;
      
      -- Check if this occurrence already exists
      IF NOT EXISTS (
        SELECT 1 FROM public.events 
        WHERE parent_event_id = event_record.id 
        AND date = next_date
      ) THEN
        -- Create new occurrence
        INSERT INTO public.events (
          title, description, location, date, time, duration,
          max_attendees, host_id, category, image_url, coordinates,
          is_recurring, recurrence_pattern, recurrence_interval,
          recurrence_end_date, recurrence_end_count, parent_event_id,
          occurrence_number, status, created_at, updated_at
        ) VALUES (
          event_record.title, event_record.description, event_record.location,
          next_date, event_record.time, event_record.duration,
          event_record.max_attendees, event_record.host_id, event_record.category,
          event_record.image_url, event_record.coordinates,
          FALSE, -- Individual occurrences are not recurring themselves
          NULL, NULL, NULL, NULL, event_record.id,
          occurrence_count + 1, 'active',
          NOW(), NOW()
        );
        
        created_count := created_count + 1;
        occurrence_count := occurrence_count + 1;
      END IF;
      
      -- Calculate next date
      CASE event_record.recurrence_pattern
        WHEN 'weekly' THEN
          next_date := next_date + INTERVAL '7 days';
        WHEN 'bi-weekly' THEN
          next_date := next_date + INTERVAL '14 days';
        WHEN 'monthly' THEN
          next_date := next_date + INTERVAL '1 month';
        WHEN 'custom' THEN
          next_date := next_date + (event_record.recurrence_interval || ' days')::INTERVAL;
      END CASE;
    END LOOP;
  END LOOP;
  
  RETURN created_count;
END;
$$;

-- Clean up excessive recurring events for standard users
-- Remove future occurrences beyond 2 weeks for standard membership users
DELETE FROM public.events 
WHERE parent_event_id IN (
  SELECT e.id 
  FROM public.events e
  JOIN public.profiles p ON e.host_id = p.id
  WHERE e.is_recurring = TRUE 
  AND e.parent_event_id IS NULL
  AND p.membership_tier != 'premium'
) 
AND occurrence_number > 2
AND date > CURRENT_DATE;