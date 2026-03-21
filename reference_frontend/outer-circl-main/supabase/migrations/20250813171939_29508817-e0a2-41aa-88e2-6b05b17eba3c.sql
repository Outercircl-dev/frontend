-- CRITICAL SECURITY FIX: Prevent Event Data Scraping by Competitors (FINAL)
-- Issue: Events table is publicly readable, allowing competitors to scrape business data
-- Solution: Implement strict access controls with proper privacy settings

-- 1. Remove the overly permissive policy that allows discovery of all events
DROP POLICY IF EXISTS "Authenticated users can discover public events" ON public.events;

-- 2. Update the existing user_can_view_event function to be much more restrictive
CREATE OR REPLACE FUNCTION public.user_can_view_event(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- User must be authenticated
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Rate limit event access checks to prevent scraping
  IF NOT public.check_profile_access_rate_limit(user_id, 'event_access', 50, 10) THEN
    -- Log suspicious activity
    PERFORM public.log_sensitive_access(
      user_id,
      'rate_limit_exceeded_event_access',
      'events',
      event_id,
      jsonb_build_object('timestamp', now(), 'action', 'potential_scraping_detected')
    );
    RETURN FALSE;
  END IF;
  
  -- Allow access only if user has legitimate relationship to event
  RETURN (
    -- User is the event host
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.host_id = user_id
    ) OR
    -- User is a confirmed participant
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = event_id 
      AND ep.user_id = user_id 
      AND ep.status = 'attending'
    ) OR
    -- User is an invited participant (can see event details to decide)
    EXISTS (
      SELECT 1 FROM public.event_invitations ei
      WHERE ei.event_id = event_id 
      AND ei.invited_user_id = user_id 
      AND ei.status = 'pending'
    ) OR
    -- User has saved the event (legitimate interest)
    EXISTS (
      SELECT 1 FROM public.saved_events se
      WHERE se.event_id = event_id AND se.user_id = user_id
    )
  );
END;
$$;

-- 3. Create a discovery function that prevents mass scraping but allows legitimate browsing
CREATE OR REPLACE FUNCTION public.discover_events_secure(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  event_date DATE,
  event_time TIME,
  category TEXT,
  max_attendees INTEGER,
  current_attendees BIGINT,
  image_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Strict rate limiting for event discovery to prevent scraping
  IF NOT public.check_profile_access_rate_limit(p_user_id, 'event_discovery', 10, 5) THEN
    -- Log potential scraping attempt
    PERFORM public.log_sensitive_access(
      p_user_id,
      'rate_limit_exceeded_event_discovery',
      'events',
      NULL,
      jsonb_build_object('category', p_category, 'location', p_location, 'timestamp', now())
    );
    RAISE EXCEPTION 'Rate limit exceeded for event discovery. Please wait before searching again.';
  END IF;
  
  -- Log the discovery request for security monitoring
  PERFORM public.log_sensitive_access(
    p_user_id,
    'event_discovery',
    'events',
    NULL,
    jsonb_build_object('category', p_category, 'location', p_location, 'limit', p_limit)
  );
  
  -- Return limited, anonymized event data for discovery
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    LEFT(e.description, 200) as description,  -- Limit description length
    CASE 
      WHEN LENGTH(e.location) > 0 THEN SPLIT_PART(e.location, ',', 1)  -- Only show city, not exact address
      ELSE e.location 
    END as location,
    e.date as event_date,
    e.time as event_time,
    e.category,
    e.max_attendees,
    COUNT(ep.user_id) as current_attendees,
    e.image_url
  FROM public.events e
  LEFT JOIN public.event_participants ep ON e.id = ep.event_id AND ep.status = 'attending'
  WHERE e.status = 'active'
    AND e.date >= CURRENT_DATE
    AND (p_category IS NULL OR e.category = p_category)
    AND (p_location IS NULL OR e.location ILIKE '%' || p_location || '%')
    -- Only show events that are genuinely discoverable (not private)
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = e.host_id 
      AND pps.profile_visibility = 'nobody'
    )
  GROUP BY e.id, e.title, e.description, e.location, e.date, e.time, e.category, e.max_attendees, e.image_url
  ORDER BY e.date ASC, e.created_at DESC
  LIMIT LEAST(p_limit, 20);  -- Cap at 20 results max
END;
$$;

-- 4. Create a secure events view that protects sensitive data
CREATE OR REPLACE VIEW public.events_secure_view AS
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
  -- Only include host_id for authorized users (not for public scraping)
  CASE 
    WHEN auth.uid() = e.host_id OR 
         EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = e.id AND ep.user_id = auth.uid()) 
    THEN e.host_id 
    ELSE NULL 
  END as host_id,
  -- Only include coordinates for participants/hosts (not for public scraping)
  CASE 
    WHEN auth.uid() = e.host_id OR 
         EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = e.id AND ep.user_id = auth.uid()) 
    THEN e.coordinates 
    ELSE NULL 
  END as coordinates
FROM public.events e
WHERE public.user_can_view_event(e.id, auth.uid());

-- 5. Add security comments
COMMENT ON FUNCTION public.user_can_view_event IS 'SECURITY: Updated with strict access control and rate limiting to prevent competitor scraping';
COMMENT ON FUNCTION public.discover_events_secure IS 'SECURITY: Rate-limited event discovery that prevents mass data scraping while allowing legitimate browsing';
COMMENT ON VIEW public.events_secure_view IS 'SECURITY: Secure view of events that protects sensitive business data from unauthorized access';

-- 6. Create summary of security improvements
SELECT 
  'EVENT SECURITY FIX COMPLETE' as status,
  'Removed public event discovery policy' as action_1,
  'Updated access control function with rate limiting' as action_2,
  'Created secure discovery function' as action_3,
  'Added comprehensive access monitoring' as action_4,
  'Protected sensitive business data from scraping' as action_5;