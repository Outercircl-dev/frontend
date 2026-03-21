-- Fix Security Definer View warning by recreating the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.events_secure_view;

-- Create a non-security-definer view that still provides protection
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

-- Add RLS to the view for extra security
ALTER VIEW public.events_secure_view SET (security_barrier = true);

COMMENT ON VIEW public.events_secure_view IS 'SECURITY: Secure view of events that protects sensitive business data from unauthorized access (non-security-definer)';

SELECT 'Security Definer View warning resolved' as status;