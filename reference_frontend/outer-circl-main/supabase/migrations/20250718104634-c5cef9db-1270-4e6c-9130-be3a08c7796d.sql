-- Fix the set_default_max_attendees function to have an explicit search_path
CREATE OR REPLACE FUNCTION public.set_default_max_attendees()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- If max_attendees is null or not set, default to 4
  IF NEW.max_attendees IS NULL THEN
    NEW.max_attendees := 4;
  END IF;
  
  RETURN NEW;
END;
$function$;