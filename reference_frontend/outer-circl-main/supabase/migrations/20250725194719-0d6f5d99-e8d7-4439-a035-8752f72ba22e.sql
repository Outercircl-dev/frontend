-- First, update the validate_event_data function to allow status changes to 'completed' for past events
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow status changes to 'completed' for past events during auto-completion
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- For new events or other updates, ensure date is not in the past
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status != 'completed') THEN
    IF NEW.date IS NOT NULL AND NEW.date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Event date cannot be in the past';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;