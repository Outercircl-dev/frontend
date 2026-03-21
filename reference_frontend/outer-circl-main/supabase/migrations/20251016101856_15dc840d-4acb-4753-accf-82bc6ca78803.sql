-- Drop and recreate get_dashboard_data_optimized with meetup_spot field
DROP FUNCTION IF EXISTS public.get_dashboard_data_optimized(uuid);

CREATE FUNCTION public.get_dashboard_data_optimized(p_user_id uuid)
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  image_url text, 
  date date, 
  event_time time without time zone, 
  location text, 
  max_attendees integer, 
  category text, 
  host_id uuid, 
  duration text, 
  coordinates jsonb, 
  meetup_spot text,
  host_name text, 
  host_avatar text, 
  attendee_count bigint, 
  is_saved boolean, 
  is_attending boolean
)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.image_url,
    e.date,
    e."time" as event_time,
    e.location,
    e.max_attendees,
    e.category,
    e.host_id,
    e.duration,
    -- Only show coordinates to participants and hosts
    CASE 
      WHEN public.is_event_participant(e.id, p_user_id) OR public.is_event_host(e.id, p_user_id)
      THEN e.coordinates
      ELSE NULL
    END as coordinates,
    -- Only show meetup_spot to participants and hosts
    CASE 
      WHEN public.is_event_participant(e.id, p_user_id) OR public.is_event_host(e.id, p_user_id)
      THEN e.meetup_spot
      ELSE NULL
    END as meetup_spot,
    p.name as host_name,
    p.avatar_url as host_avatar,
    COALESCE(pc.participant_count, 1) as attendee_count,
    -- Check if user has saved this event
    EXISTS(
      SELECT 1 FROM saved_events se 
      WHERE se.event_id = e.id AND se.user_id = p_user_id
    ) as is_saved,
    -- Check if user is attending
    (e.host_id = p_user_id OR EXISTS(
      SELECT 1 FROM event_participants ep 
      WHERE ep.event_id = e.id 
        AND ep.user_id = p_user_id 
        AND ep.status = 'attending'
    )) as is_attending
  FROM events e
  LEFT JOIN profiles p ON p.id = e.host_id
  LEFT JOIN (
    SELECT 
      event_id, 
      COUNT(*) as participant_count
    FROM event_participants 
    WHERE status = 'attending'
    GROUP BY event_id
  ) pc ON pc.event_id = e.id
  WHERE e.status = 'active' 
    AND e.date >= CURRENT_DATE
  ORDER BY e.date ASC, e.created_at DESC
  LIMIT 50;
END;
$function$;