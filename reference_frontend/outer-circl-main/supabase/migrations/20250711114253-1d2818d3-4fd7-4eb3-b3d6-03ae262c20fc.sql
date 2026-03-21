-- Temporarily disable the date validation trigger
ALTER TABLE public.events DISABLE TRIGGER validate_event_data_trigger;

-- Update existing events with max_attendees = 5 to be max_attendees = 4
UPDATE public.events 
SET max_attendees = 4, updated_at = now()
WHERE max_attendees = 5;

-- Re-enable the date validation trigger
ALTER TABLE public.events ENABLE TRIGGER validate_event_data_trigger;

-- Add a database function to automatically set max_attendees to 4 for new events if not specified
CREATE OR REPLACE FUNCTION public.set_default_max_attendees()
RETURNS TRIGGER AS $$
BEGIN
  -- If max_attendees is null or not set, default to 4
  IF NEW.max_attendees IS NULL THEN
    NEW.max_attendees := 4;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set default max_attendees on insert
DROP TRIGGER IF EXISTS set_default_max_attendees_trigger ON public.events;
CREATE TRIGGER set_default_max_attendees_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_max_attendees();