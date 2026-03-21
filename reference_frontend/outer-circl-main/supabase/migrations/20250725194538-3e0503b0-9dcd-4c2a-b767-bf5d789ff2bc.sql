-- Temporarily disable the event validation trigger to allow auto-completion
ALTER TABLE public.events DISABLE TRIGGER IF EXISTS validate_event_trigger;

-- Manually complete past events that should have been auto-completed
UPDATE public.events 
SET status = 'completed', updated_at = NOW()
WHERE status = 'active' 
  AND (
    (date < CURRENT_DATE) OR 
    (date = CURRENT_DATE AND time IS NOT NULL AND (date + time) < NOW())
  );

-- Re-enable the event validation trigger
ALTER TABLE public.events ENABLE TRIGGER IF EXISTS validate_event_trigger;

-- Update the validate_event_data function to allow status changes to 'completed' for past events
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