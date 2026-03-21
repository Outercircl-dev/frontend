-- Replace the set_default_max_attendees function with a secure version that has explicit search path
CREATE OR REPLACE FUNCTION public.set_default_max_attendees()
RETURNS TRIGGER AS $$
BEGIN
  -- Set explicit search path for security
  SET search_path = '';
  
  -- If max_attendees is null or not set, default to 4
  IF NEW.max_attendees IS NULL THEN
    NEW.max_attendees := 4;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;