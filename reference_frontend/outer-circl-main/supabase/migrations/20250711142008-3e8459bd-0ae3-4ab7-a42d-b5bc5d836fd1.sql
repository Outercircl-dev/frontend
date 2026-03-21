-- Update the event validation function to replace 'networking' with 'gaming'
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate date is not in the past (allow today)
  IF NEW.date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date cannot be in the past';
  END IF;
  
  -- Validate future date limit (max 2 years ahead)
  IF NEW.date > CURRENT_DATE + INTERVAL '2 years' THEN
    RAISE EXCEPTION 'Event date cannot be more than 2 years in the future';
  END IF;
  
  -- Validate time format and reasonable hours
  IF NEW.time IS NOT NULL AND (EXTRACT(HOUR FROM NEW.time) < 0 OR EXTRACT(HOUR FROM NEW.time) > 23) THEN
    RAISE EXCEPTION 'Invalid time format';
  END IF;
  
  -- Validate status
  IF NEW.status NOT IN ('active', 'draft', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Invalid event status';
  END IF;
  
  -- Update category validation to replace 'networking' with 'gaming'
  IF NEW.category IS NOT NULL AND NEW.category NOT IN (
    'social', 'education', 'sports', 'arts', 'technology', 
    'food', 'fitness', 'health-wellness', 'outdoors', 'gaming', 'giving-back', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid event category';
  END IF;
  
  RETURN NEW;
END;
$function$;