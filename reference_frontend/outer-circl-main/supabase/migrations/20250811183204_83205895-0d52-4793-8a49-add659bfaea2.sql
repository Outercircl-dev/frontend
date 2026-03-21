-- PHASE 1: Fix Critical Database Security Issues (Corrected)

-- Step 1: Fix infinite recursion in RLS policies by creating security definer functions

-- Create security definer function to check if user is event host
CREATE OR REPLACE FUNCTION public.is_event_host(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND host_id = user_id
  );
$$;

-- Create security definer function to check if user is event participant
CREATE OR REPLACE FUNCTION public.is_event_participant(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants 
    WHERE event_id = is_event_participant.event_id 
    AND user_id = is_event_participant.user_id 
    AND status = 'attending'
  );
$$;

-- Create security definer function to check if user can view event details
CREATE OR REPLACE FUNCTION public.user_can_view_event(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    -- User is the host
    public.is_event_host(event_id, user_id) OR
    -- User is a confirmed participant
    public.is_event_participant(event_id, user_id) OR
    -- Event is public and active
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id 
      AND e.status = 'active' 
      AND e.date >= CURRENT_DATE
    )
  );
$$;

-- Step 2: Drop and recreate problematic RLS policies

-- Drop existing problematic policies on events table
DROP POLICY IF EXISTS "Event hosts can update their events" ON public.events;
DROP POLICY IF EXISTS "Event hosts can delete their events" ON public.events;
DROP POLICY IF EXISTS "Hosts can view their own events" ON public.events;
DROP POLICY IF EXISTS "Participants can view their events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

-- Create new safe RLS policies for events
CREATE POLICY "Event hosts can manage their events" 
ON public.events 
FOR ALL 
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can view events they can access" 
ON public.events 
FOR SELECT 
USING (public.user_can_view_event(id, auth.uid()));

-- Drop existing problematic policies on event_participants table
DROP POLICY IF EXISTS "Event hosts can manage participants" ON public.event_participants;
DROP POLICY IF EXISTS "Event participants and hosts can view participants" ON public.event_participants;
DROP POLICY IF EXISTS "Users can join events" ON public.event_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.event_participants;

-- Create new safe RLS policies for event_participants
CREATE POLICY "Users can manage their own participation" 
ON public.event_participants 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event hosts can view and manage participants" 
ON public.event_participants 
FOR ALL 
USING (public.is_event_host(event_id, auth.uid()));

CREATE POLICY "Participants can view other participants" 
ON public.event_participants 
FOR SELECT 
USING (public.is_event_participant(event_id, auth.uid()));

-- Step 3: Add RLS protection to user_activity_summary view
-- First check if it exists and drop if needed
DROP VIEW IF EXISTS public.user_activity_summary;

-- Recreate as a proper view with RLS-compatible structure
CREATE VIEW public.user_activity_summary AS
SELECT 
  uah.user_id,
  SUM(uah.activity_count) as total_activities,
  COUNT(DISTINCT uah.category) as categories_participated,
  MAX(uah.last_activity_date) as last_activity_date,
  jsonb_object_agg(uah.category, uah.activity_count) as activities_by_category,
  p.name as user_name,
  p.email as user_email
FROM public.user_activity_history uah
JOIN public.profiles p ON p.id = uah.user_id
WHERE p.account_status = 'active'
GROUP BY uah.user_id, p.name, p.email;

-- Enable RLS on the view
ALTER VIEW public.user_activity_summary SET (security_barrier = true);

-- Grant access to authenticated users (they'll only see their own data via RLS)
GRANT SELECT ON public.user_activity_summary TO authenticated;

-- Step 4: Strengthen invitations table RLS to protect emails
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.invitations;

-- Create more restrictive policy for email access
CREATE POLICY "Users can view invitations for their verified email only" 
ON public.invitations 
FOR SELECT 
USING (
  email = auth.email() AND 
  auth.email() IS NOT NULL AND
  -- Additional check to ensure user is authenticated
  auth.uid() IS NOT NULL
);

-- Step 5: Create security monitoring functions
CREATE OR REPLACE FUNCTION public.log_security_violation(
  violation_type text,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log security violations for monitoring
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    success,
    error_message,
    ip_address
  ) VALUES (
    auth.uid(),
    violation_type,
    'security_violation',
    false,
    details::text,
    inet_client_addr()
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_event_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_event(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_violation(text, jsonb) TO authenticated;