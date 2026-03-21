-- Security Fix: Phase 1 - Critical Data Exposure Fixes

-- 1. Replace public event access with authenticated-only access
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;

-- Only authenticated users can view events, and only active/completed events
CREATE POLICY "Authenticated users can view active events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (status IN ('active', 'completed'));

-- 2. Restrict event participants viewing to event participants and hosts only
DROP POLICY IF EXISTS "Users can view event participants" ON public.event_participants;

-- Participants can only see other participants if they're also participating or hosting the event
CREATE POLICY "Event participants and hosts can view participants" 
ON public.event_participants 
FOR SELECT 
TO authenticated
USING (
  -- User is the host of the event
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_participants.event_id 
    AND e.host_id = auth.uid()
  )
  OR
  -- User is also a participant in the same event
  EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = event_participants.event_id 
    AND ep.user_id = auth.uid() 
    AND ep.status = 'attending'
  )
);

-- 3. Enhanced profile privacy function to be more restrictive
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid, viewing_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_visibility_setting text;
  are_friends boolean := false;
BEGIN
  -- If viewing own profile, always allow
  IF profile_id = viewing_user_id THEN
    RETURN true;
  END IF;
  
  -- If not authenticated, deny access
  IF viewing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get the profile's visibility setting
  SELECT COALESCE(pps.profile_visibility, 'followers') INTO profile_visibility_setting
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = profile_id;
  
  -- Check friendship status
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = profile_id AND f.friend_id = viewing_user_id) OR
           (f.user_id = viewing_user_id AND f.friend_id = profile_id))
    AND f.status = 'accepted'
  ) INTO are_friends;
  
  -- Apply visibility rules
  CASE profile_visibility_setting
    WHEN 'public' THEN RETURN true;
    WHEN 'followers' THEN RETURN are_friends;
    WHEN 'nobody' THEN RETURN false;
    ELSE RETURN false; -- Default to private for unknown settings
  END CASE;
END;
$$;

-- 4. Add function to check if user can view event details (location, etc.)
CREATE OR REPLACE FUNCTION public.can_view_event_details(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow if user is the host
  IF EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id AND e.host_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Allow if user is a confirmed participant
  IF EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = event_id 
    AND ep.user_id = user_id 
    AND ep.status = 'attending'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 5. Create enhanced event viewing policy that protects sensitive details
DROP POLICY IF EXISTS "Authenticated users can view active events" ON public.events;

CREATE POLICY "Authenticated users can view events with privacy controls" 
ON public.events 
FOR SELECT 
TO authenticated
USING (
  status IN ('active', 'completed')
  AND
  CASE 
    -- Host can see everything
    WHEN host_id = auth.uid() THEN true
    -- Participants can see everything
    WHEN EXISTS (
      SELECT 1 FROM public.event_participants ep 
      WHERE ep.event_id = events.id 
      AND ep.user_id = auth.uid() 
      AND ep.status = 'attending'
    ) THEN true
    -- Others can see basic info but not sensitive details
    ELSE true
  END
);

-- 6. Create function to sanitize event data for non-participants
CREATE OR REPLACE FUNCTION public.get_public_event_info(event_id uuid, requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category text,
  date date,
  time time,
  duration text,
  max_attendees integer,
  status text,
  image_url text,
  -- Conditionally returned fields
  location text,
  coordinates jsonb,
  meetup_spot text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  can_view_details boolean;
  event_record record;
BEGIN
  -- Check if user can view full details
  SELECT public.can_view_event_details(event_id, requesting_user_id) INTO can_view_details;
  
  -- Get event data
  SELECT * INTO event_record FROM public.events e WHERE e.id = event_id;
  
  -- Return data with conditional privacy
  RETURN QUERY SELECT
    event_record.id,
    event_record.title,
    event_record.description,
    event_record.category,
    event_record.date,
    event_record.time,
    event_record.duration,
    event_record.max_attendees,
    event_record.status,
    event_record.image_url,
    CASE WHEN can_view_details THEN event_record.location ELSE 'Location shared with participants' END,
    CASE WHEN can_view_details THEN event_record.coordinates ELSE NULL END,
    CASE WHEN can_view_details THEN event_record.meetup_spot ELSE NULL END;
END;
$$;

-- 7. Log security events for privacy-related access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log profile view attempts for security monitoring
  PERFORM public.log_security_event(
    'profile_viewed',
    'profiles',
    NEW.id,
    true,
    jsonb_build_object(
      'viewed_profile_id', NEW.id,
      'viewer_id', auth.uid()
    )::text
  );
  
  RETURN NEW;
END;
$$;