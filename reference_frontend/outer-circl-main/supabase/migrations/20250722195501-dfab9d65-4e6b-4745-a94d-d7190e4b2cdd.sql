-- Fix the validate_event_data trigger to allow status updates to 'completed' for past events
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow status changes to 'completed' without date validation
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Skip date validation for completion updates
    RETURN NEW;
  END IF;
  
  -- Only validate date constraints for new events or when date is being changed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date) THEN
    -- Validate date is not in the past (allow today)
    IF NEW.date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Event date cannot be in the past';
    END IF;
    
    -- Validate future date limit (max 2 years ahead)
    IF NEW.date > CURRENT_DATE + INTERVAL '2 years' THEN
      RAISE EXCEPTION 'Event date cannot be more than 2 years in the future';
    END IF;
  END IF;
  
  -- Always validate time format and reasonable hours
  IF NEW.time IS NOT NULL AND (EXTRACT(HOUR FROM NEW.time) < 0 OR EXTRACT(HOUR FROM NEW.time) > 23) THEN
    RAISE EXCEPTION 'Invalid time format';
  END IF;
  
  -- Always validate status
  IF NEW.status NOT IN ('active', 'draft', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Invalid event status';
  END IF;
  
  -- Always validate category
  IF NEW.category IS NOT NULL AND NEW.category NOT IN (
    'social', 'education', 'sports', 'arts', 'technology', 
    'food', 'fitness', 'health-wellness', 'outdoors', 'gaming', 'giving-back', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid event category';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Now run the auto-completion function to mark past events as completed
SELECT public.auto_complete_past_events();