-- Fix dashboard event discovery by updating RLS policy to allow basic discovery

-- Update events table RLS policy to allow discovery of basic event info
DROP POLICY IF EXISTS "Users can view events they can access" ON public.events;

CREATE POLICY "Users can view events they can access" ON public.events
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Full access for hosts, participants, and saved events (existing logic)
    public.user_can_view_event(id, auth.uid()) OR
    -- Discovery access for active upcoming events
    (
      status = 'active' AND
      date >= CURRENT_DATE AND
      -- Rate limit discovery to prevent abuse
      public.check_rate_limit(auth.uid(), NULL, 'event_discovery', 100, 60)
    )
  )
);

-- Update events_secure_view to allow discovery while protecting sensitive data
DROP VIEW IF EXISTS public.events_secure_view;

CREATE VIEW public.events_secure_view AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.location,
  e.date,
  e.time,
  e.duration,
  e.category,
  e.max_attendees,
  e.status,
  e.image_url,
  e.created_at,
  e.updated_at,
  -- Only include host_id for authorized users or participants
  CASE 
    WHEN auth.uid() = e.host_id OR 
         EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = e.id AND ep.user_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM public.saved_events se WHERE se.event_id = e.id AND se.user_id = auth.uid())
    THEN e.host_id 
    ELSE NULL 
  END as host_id,
  -- Only include exact coordinates for participants/hosts (discovery gets general location only)
  CASE 
    WHEN auth.uid() = e.host_id OR 
         EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = e.id AND ep.user_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM public.saved_events se WHERE se.event_id = e.id AND se.user_id = auth.uid())
    THEN e.coordinates 
    ELSE NULL 
  END as coordinates
FROM public.events e
WHERE (
  -- Full access for connected users
  public.user_can_view_event(e.id, auth.uid()) OR
  -- Discovery access for active upcoming events with rate limiting
  (
    auth.uid() IS NOT NULL AND
    e.status = 'active' AND
    e.date >= CURRENT_DATE AND
    public.check_rate_limit(auth.uid(), NULL, 'event_discovery', 100, 60)
  )
);

-- Add RLS to the view for extra security
ALTER VIEW public.events_secure_view SET (security_barrier = true);

COMMENT ON VIEW public.events_secure_view IS 'SECURITY: Secure view allowing event discovery while protecting sensitive data from scraping';

SELECT 'Dashboard event discovery restored with rate limiting protection' as status;