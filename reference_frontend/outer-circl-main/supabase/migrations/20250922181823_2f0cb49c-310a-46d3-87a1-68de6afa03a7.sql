-- Create optimized event details function that batches all queries
CREATE OR REPLACE FUNCTION public.get_event_details_optimized(p_event_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  event_data jsonb;
  participants_data jsonb;
  messages_data jsonb;
  user_status jsonb;
BEGIN
  -- Validate input
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Event ID cannot be null';
  END IF;
  
  -- Check if user can view this event
  IF p_user_id IS NOT NULL AND NOT user_can_view_event(p_event_id, p_user_id) THEN
    RAISE EXCEPTION 'Access denied: User cannot view this event';
  END IF;
  
  -- Get event details with host profile in single query
  SELECT jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'location', e.location,
    'date', e.date,
    'time', e.time,
    'duration', e.duration,
    'max_attendees', e.max_attendees,
    'category', e.category,
    'image_url', e.image_url,
    'coordinates', e.coordinates,
    'status', e.status,
    'created_at', e.created_at,
    'host_id', e.host_id,
    'host', jsonb_build_object(
      'id', p.id,
      'name', COALESCE(p.name, 'Unknown Host'),
      'username', p.username,
      'avatar_url', COALESCE(p.avatar_url, 'https://randomuser.me/api/portraits/women/44.jpg'),
      'bio', p.bio
    )
  ) INTO event_data
  FROM public.events e
  LEFT JOIN public.profiles p ON p.id = e.host_id
  WHERE e.id = p_event_id;
  
  IF event_data IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Get participants with profiles in single query
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ep.user_id,
      'name', COALESCE(p.name, 'Unknown User'),
      'username', p.username,
      'avatar', COALESCE(p.avatar_url, 'https://randomuser.me/api/portraits/women/44.jpg'),
      'joined_at', ep.joined_at,
      'status', ep.status
    ) ORDER BY ep.joined_at
  ) INTO participants_data
  FROM public.event_participants ep
  LEFT JOIN public.profiles p ON p.id = ep.user_id
  WHERE ep.event_id = p_event_id 
    AND ep.status = 'attending';
  
  -- Get messages with sender profiles in single query (limit to recent 50)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'content', m.content,
      'created_at', m.created_at,
      'user', jsonb_build_object(
        'id', m.sender_id,
        'name', COALESCE(p.name, 'Anonymous'),
        'avatar', COALESCE(p.avatar_url, 'https://randomuser.me/api/portraits/women/44.jpg')
      )
    ) ORDER BY m.created_at DESC
  ) INTO messages_data
  FROM (
    SELECT * FROM public.messages 
    WHERE event_id = p_event_id 
      AND message_type = 'event'
    ORDER BY created_at DESC 
    LIMIT 50
  ) m
  LEFT JOIN public.profiles p ON p.id = m.sender_id;
  
  -- Get user-specific status if user is provided
  IF p_user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'isAttending', EXISTS(
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = p_event_id 
          AND ep.user_id = p_user_id 
          AND ep.status = 'attending'
      ),
      'isSaved', EXISTS(
        SELECT 1 FROM public.saved_events se
        WHERE se.event_id = p_event_id 
          AND se.user_id = p_user_id
      ),
      'isHost', (event_data->>'host_id')::uuid = p_user_id
    ) INTO user_status;
  ELSE
    user_status := jsonb_build_object(
      'isAttending', false,
      'isSaved', false,
      'isHost', false
    );
  END IF;
  
  -- Combine all data into single response
  result := jsonb_build_object(
    'event', event_data,
    'participants', COALESCE(participants_data, '[]'::jsonb),
    'messages', COALESCE(messages_data, '[]'::jsonb),
    'userStatus', user_status,
    'participantCount', (
      SELECT COUNT(*) FROM public.event_participants ep
      WHERE ep.event_id = p_event_id AND ep.status = 'attending'
    )
  );
  
  RETURN result;
END;
$function$;