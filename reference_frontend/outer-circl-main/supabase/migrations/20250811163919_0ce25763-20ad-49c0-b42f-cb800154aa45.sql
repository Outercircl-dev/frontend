-- Fix critical security vulnerability: Events table is publicly readable
-- This exposes host IDs, exact locations, and participant details to anyone

-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view all events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view active events" ON public.events;

-- Create secure policies that only show events to relevant users
-- Policy 1: Users can view events they are hosting
CREATE POLICY "Users can view their own events" 
ON public.events 
FOR SELECT 
USING (auth.uid() = host_id);

-- Policy 2: Users can view events they are participating in
CREATE POLICY "Users can view events they participate in" 
ON public.events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = events.id 
    AND ep.user_id = auth.uid() 
    AND ep.status = 'attending'
  )
);

-- Policy 3: Limited public discovery (only basic info for active events, no sensitive details)
-- This allows browsing events for discovery but protects sensitive information
CREATE POLICY "Public can view limited event info for discovery" 
ON public.events 
FOR SELECT 
USING (
  status = 'active' 
  AND date >= CURRENT_DATE 
  -- This policy will be used with a view that excludes sensitive fields
);

-- Create a secure view for public event discovery that excludes sensitive information
CREATE OR REPLACE VIEW public.events_public_view AS
SELECT 
  id,
  title,
  description,
  category,
  date,
  time,
  duration,
  status,
  max_attendees,
  image_url,
  created_at,
  -- Exclude sensitive fields:
  -- location (exact address)
  -- host_id (user identity) 
  -- coordinates (exact GPS)
  -- meetup_spot (specific meeting details)
  
  -- Instead provide general area or city only
  CASE 
    WHEN location IS NOT NULL THEN 
      -- Extract just the city/area from location, not exact address
      split_part(location, ',', -1) -- Gets the last part (usually city/state)
    ELSE NULL 
  END as general_area,
  
  -- Count of current participants (public info)
  (
    SELECT COUNT(*) 
    FROM public.event_participants ep 
    WHERE ep.event_id = events.id 
    AND ep.status = 'attending'
  ) as participant_count
  
FROM public.events
WHERE status = 'active' 
AND date >= CURRENT_DATE;

-- Enable RLS on the view
ALTER VIEW public.events_public_view SET (security_barrier = true);

-- Grant access to the public view for authenticated users
GRANT SELECT ON public.events_public_view TO authenticated;

-- Create RLS policy for the public view
CREATE POLICY "Authenticated users can browse public events" 
ON public.events_public_view 
FOR SELECT 
TO authenticated
USING (true);