-- Create optimized RPC function for unified dashboard data
CREATE OR REPLACE FUNCTION public.get_unified_dashboard_data(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  events_data JSON;
  saved_events_data JSON;
BEGIN
  -- Get events with host info and participation status in single query
  SELECT json_agg(
    json_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'image_url', e.image_url,
      'date', e.date,
      'time', e.time,
      'location', e.location,
      'max_attendees', e.max_attendees,
      'category', e.category,
      'host_id', e.host_id,
      'duration', e.duration,
      'coordinates', e.coordinates,
      'host_name', p.name,
      'host_avatar', p.avatar_url,
      'participant_count', COALESCE(ep.participant_count, 1),
      'user_is_attending', CASE 
        WHEN e.host_id = p_user_id THEN true
        WHEN uep.status = 'attending' THEN true
        ELSE false
      END
    )
  ) INTO events_data
  FROM events e
  LEFT JOIN profiles p ON e.host_id = p.id
  LEFT JOIN (
    SELECT event_id, COUNT(*) as participant_count
    FROM event_participants 
    WHERE status = 'attending'
    GROUP BY event_id
  ) ep ON e.id = ep.event_id
  LEFT JOIN event_participants uep ON e.id = uep.event_id AND uep.user_id = p_user_id
  WHERE e.status = 'active' 
    AND e.date >= CURRENT_DATE
  ORDER BY e.date ASC, e.time ASC
  LIMIT p_limit;

  -- Get user's saved events
  SELECT json_agg(
    json_build_object(
      'event_id', se.event_id,
      'created_at', se.created_at
    )
  ) INTO saved_events_data
  FROM saved_events se
  WHERE se.user_id = p_user_id;

  -- Combine results
  SELECT json_build_object(
    'events', COALESCE(events_data, '[]'::json),
    'saved_events', COALESCE(saved_events_data, '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_unified_dashboard_data TO authenticated;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_events_active_date ON events(status, date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_event_participants_event_user ON event_participants(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_user ON saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Add comment for documentation
COMMENT ON FUNCTION public.get_unified_dashboard_data IS 'Optimized function to fetch unified dashboard data including events, host info, and user participation status in a single query';