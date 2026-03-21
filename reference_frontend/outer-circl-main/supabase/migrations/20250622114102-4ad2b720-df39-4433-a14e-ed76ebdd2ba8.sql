
-- Update the validate_event_data function to use the same categories as the frontend
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS trigger
LANGUAGE plpgsql
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
  
  -- Update category validation to match frontend categories exactly
  IF NEW.category IS NOT NULL AND NEW.category NOT IN (
    'social', 'education', 'sports', 'arts', 'technology', 
    'food', 'fitness', 'outdoors', 'networking', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid event category';
  END IF;
  
  RETURN NEW;
END;
$function$;
