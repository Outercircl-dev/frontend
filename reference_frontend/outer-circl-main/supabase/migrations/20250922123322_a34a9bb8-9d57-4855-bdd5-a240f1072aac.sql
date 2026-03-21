-- Update remaining functions with missing search path settings

-- Check and update all validation functions
ALTER FUNCTION public.validate_app_preferences() SET search_path = '';

-- Update refresh dashboard function if it exists
CREATE OR REPLACE FUNCTION public.refresh_dashboard_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  processed_count INTEGER := 0;
BEGIN
  -- Delete old optimized data
  DELETE FROM public.dashboard_events_optimized;
  
  -- Insert fresh optimized data for active events
  INSERT INTO public.dashboard_events_optimized (
    id, title, description, location, date, time, duration,
    max_attendees, host_id, category, image_url, coordinates,
    status, created_at, updated_at, participant_count, is_user_participating
  )
  SELECT 
    e.id, e.title, e.description, e.location, e.date, e.time, e.duration,
    e.max_attendees, e.host_id, e.category, e.image_url, e.coordinates,
    e.status, e.created_at, e.updated_at,
    COALESCE(pc.participant_count, 0) as participant_count,
    false as is_user_participating -- Will be updated per user in real-time
  FROM public.events e
  LEFT JOIN (
    SELECT 
      event_id, 
      COUNT(*) as participant_count
    FROM public.event_participants 
    WHERE status = 'attending'
    GROUP BY event_id
  ) pc ON e.id = pc.event_id
  WHERE e.status = 'active'
    AND e.date >= CURRENT_DATE;
    
  GET DIAGNOSTICS processed_count = ROW_COUNT;
  RETURN processed_count;
END;
$function$;