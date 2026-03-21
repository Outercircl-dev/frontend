-- Phase 1: Database Performance Optimization (Fixed)

-- Add composite indexes for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_dashboard_performance 
ON events (status, date, created_at) 
WHERE status = 'active';

-- Index for event participants queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_participants_dashboard
ON event_participants (user_id, event_id, status)
WHERE status = 'attending';

-- Index for saved events queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_events_user_lookup
ON saved_events (user_id, event_id);

-- Index for profile lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_dashboard
ON profiles (id) INCLUDE (name, avatar_url, membership_tier);

-- Create materialized view for dashboard events (refreshed every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_events_optimized AS
SELECT 
  e.id,
  e.title,
  e.description, 
  e.image_url,
  e.date,
  e."time",  -- Escape reserved keyword
  e.location,
  e.max_attendees,
  e.category,
  e.host_id,
  e.duration,
  e.coordinates,
  e.created_at,
  p.name as host_name,
  p.avatar_url as host_avatar,
  p.membership_tier as host_tier,
  -- Pre-calculate participant counts
  COALESCE(pc.participant_count, 1) as attendee_count
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
ORDER BY e.date ASC, e.created_at DESC;

-- Index on the materialized view
CREATE INDEX IF NOT EXISTS idx_dashboard_events_optimized_date
ON dashboard_events_optimized (date, created_at);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_events()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_events_optimized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for optimized dashboard data fetch
CREATE OR REPLACE FUNCTION get_dashboard_data_optimized(p_user_id uuid)
RETURNS TABLE(
  -- Event data
  id uuid,
  title text,
  description text,
  image_url text,
  date date,
  event_time time,
  location text,
  max_attendees integer,
  category text,
  host_id uuid,
  duration text,
  coordinates jsonb,
  host_name text,
  host_avatar text,
  attendee_count bigint,
  -- User-specific data
  is_saved boolean,
  is_attending boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dev.id,
    dev.title,
    dev.description,
    dev.image_url,
    dev.date,
    dev."time" as event_time,
    dev.location,
    dev.max_attendees,
    dev.category,
    dev.host_id,
    dev.duration,
    dev.coordinates,
    dev.host_name,
    dev.host_avatar,
    dev.attendee_count,
    -- Check if user has saved this event
    EXISTS(
      SELECT 1 FROM saved_events se 
      WHERE se.event_id = dev.id AND se.user_id = p_user_id
    ) as is_saved,
    -- Check if user is attending
    (dev.host_id = p_user_id OR EXISTS(
      SELECT 1 FROM event_participants ep 
      WHERE ep.event_id = dev.id 
        AND ep.user_id = p_user_id 
        AND ep.status = 'attending'
    )) as is_attending
  FROM dashboard_events_optimized dev
  ORDER BY dev.date ASC, dev.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;