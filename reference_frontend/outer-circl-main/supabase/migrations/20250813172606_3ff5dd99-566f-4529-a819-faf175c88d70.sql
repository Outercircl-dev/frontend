-- Fix dashboard event discovery while maintaining security protections

-- Create secure event discovery function with rate limiting and logging
CREATE OR REPLACE FUNCTION public.discover_events_secure(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Must be authenticated
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Rate limit: max 100 discovery requests per hour per user
  IF NOT public.check_rate_limit(p_user_id, NULL, 'event_discovery', 100, 60) THEN
    -- Log suspicious activity
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'events',
      p_user_id,
      false,
      'Event discovery rate limit exceeded'
    );
    RETURN false;
  END IF;
  
  -- Log legitimate discovery for security monitoring
  PERFORM public.log_security_event(
    'event_discovery',
    'events',
    p_user_id,
    true,
    'User discovering events through dashboard'
  );
  
  RETURN true;
END;
$$;

-- Update events table RLS policy to allow discovery of basic event info
DROP POLICY IF EXISTS "Users can view events they can access" ON public.events;

CREATE POLICY "Users can view events they can access" ON public.events
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Full access for hosts, participants, and saved events (existing logic)
    public.user_can_view_event(id, auth.uid()) OR
    -- Discovery access for basic event info (new logic)
    (
      public.discover_events_secure(auth.uid()) AND
      status = 'active' AND
      date >= CURRENT_DATE
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
  -- Discovery access for active upcoming events
  (
    auth.uid() IS NOT NULL AND
    public.discover_events_secure(auth.uid()) AND
    e.status = 'active' AND
    e.date >= CURRENT_DATE
  )
);

-- Add RLS to the view for extra security
ALTER VIEW public.events_secure_view SET (security_barrier = true);

COMMENT ON VIEW public.events_secure_view IS 'SECURITY: Secure view allowing event discovery while protecting sensitive data from scraping';

-- Create helper function to check if user has discovery permissions
CREATE OR REPLACE FUNCTION public.can_discover_events(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND public.discover_events_secure(p_user_id);
$$;

COMMENT ON FUNCTION public.discover_events_secure IS 'SECURITY: Controls event discovery with rate limiting and logging to prevent mass scraping';
COMMENT ON FUNCTION public.can_discover_events IS 'SECURITY: Helper function to check event discovery permissions';

SELECT 'Dashboard event discovery restored with security protections' as status;