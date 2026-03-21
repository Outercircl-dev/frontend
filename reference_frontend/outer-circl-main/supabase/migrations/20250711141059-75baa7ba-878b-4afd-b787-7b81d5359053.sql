-- Add recurring event fields to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT; -- 'weekly', 'bi-weekly', 'monthly', 'custom'
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER; -- for custom intervals (e.g., every 2 weeks)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE; -- when to stop creating events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurrence_end_count INTEGER; -- max number of occurrences
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE; -- links to original recurring event
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS occurrence_number INTEGER DEFAULT 1; -- which occurrence this is (1st, 2nd, etc.)

-- Create index for better performance on recurring event queries
CREATE INDEX IF NOT EXISTS idx_events_recurring ON public.events(is_recurring, parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_parent_event ON public.events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- Create function to generate recurring events
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
  max_future_months INTEGER := 6; -- Only create events up to 6 months in advance
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

-- Create trigger function to automatically create first few recurring instances
CREATE OR REPLACE FUNCTION public.handle_new_recurring_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only process if this is a new recurring event (not an occurrence)
  IF NEW.is_recurring = TRUE AND NEW.parent_event_id IS NULL THEN
    -- Call the function to create initial recurring events
    PERFORM public.create_recurring_events();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new recurring events
DROP TRIGGER IF EXISTS trigger_new_recurring_event ON public.events;
CREATE TRIGGER trigger_new_recurring_event
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_recurring_event();