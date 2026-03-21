-- Step 1: Create secure view for dashboard that conditionally shows sensitive fields
CREATE OR REPLACE VIEW public.events_dashboard_secure 
WITH (security_invoker = on)
AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.image_url,
  e.date,
  e.time,
  e.location,
  e.category,
  e.duration,
  e.max_attendees,
  e.host_id,
  e.status,
  e.is_recurring,
  e.recurrence_pattern,
  e.recurring_type,
  e.gender_preference,
  e.created_at,
  e.updated_at,
  e.completed_at,
  e.occurrence_number,
  e.parent_event_id,
  e.recurrence_end_count,
  e.recurrence_end_date,
  e.recurrence_interval,
  -- Conditional sensitive fields based on participation
  CASE 
    WHEN public.is_event_participant(e.id, auth.uid()) OR public.is_event_host(e.id, auth.uid())
    THEN e.meetup_spot
    ELSE NULL
  END as meetup_spot,
  CASE 
    WHEN public.is_event_participant(e.id, auth.uid()) OR public.is_event_host(e.id, auth.uid())
    THEN e.coordinates
    ELSE NULL
  END as coordinates
FROM public.events e
WHERE e.status = 'active' 
  AND e.date >= CURRENT_DATE
  AND auth.uid() IS NOT NULL;

-- Step 2: Update RLS policy to strictly require authentication
DROP POLICY IF EXISTS "Users can view events they can access" ON public.events;

CREATE POLICY "Authenticated users can view active events"
ON public.events
FOR SELECT
USING (
  -- MUST be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Can view if they have legitimate access
    user_can_view_event(id, auth.uid())
    OR 
    -- Or if it's an active future event (but sensitive fields protected by view)
    (status = 'active' AND date >= CURRENT_DATE)
  )
);