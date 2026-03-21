-- Fix ambiguous activity_count reference in track_activity_participation function
DROP FUNCTION IF EXISTS public.track_activity_participation() CASCADE;

CREATE OR REPLACE FUNCTION public.track_activity_participation()
RETURNS trigger
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status = 'attending' AND (OLD IS NULL OR OLD.status != 'attending') THEN
    -- Get event details and insert/update activity history
    INSERT INTO public.user_activity_history (user_id, category, activity_count, last_activity_date)
    SELECT 
      NEW.user_id,
      COALESCE(e.category, 'other'),
      1,
      e.date
    FROM public.events e
    WHERE e.id = NEW.event_id
    ON CONFLICT (user_id, category) 
    DO UPDATE SET 
      activity_count = user_activity_history.activity_count + 1,
      last_activity_date = GREATEST(user_activity_history.last_activity_date, EXCLUDED.last_activity_date),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER track_participation
  AFTER INSERT OR UPDATE ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.track_activity_participation();