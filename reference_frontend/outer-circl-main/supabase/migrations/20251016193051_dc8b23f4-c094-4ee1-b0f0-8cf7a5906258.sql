-- Remove GPS exposure from events_public_view for privacy
-- This prevents unauthorized tracking before users join events

DROP VIEW IF EXISTS public.events_public_view CASCADE;

CREATE VIEW public.events_public_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  title,
  description,
  date,
  time,
  location,              -- Keep general location (e.g., "Central Park")
  category,
  image_url,
  status,
  duration,
  gender_preference,
  max_attendees,
  host_id,
  is_recurring,
  recurring_type,
  recurrence_pattern,
  recurrence_interval,
  recurrence_end_date,
  recurrence_end_count,
  parent_event_id,
  occurrence_number,
  completed_at,
  created_at,
  updated_at
  -- REMOVED: meetup_spot (precise meeting point)
  -- REMOVED: coordinates (GPS lat/lng)
FROM public.events;

COMMENT ON VIEW public.events_public_view IS 
  'Public event discovery view - excludes precise GPS coordinates and meetup spots for privacy. Use events_dashboard_secure for participant access to precise locations.';