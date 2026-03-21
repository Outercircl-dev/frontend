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

-- 3. Drop profile policy that depends on can_view_profile function
DROP POLICY IF EXISTS "Users can view profiles based on privacy settings" ON public.profiles;

-- Drop and recreate the can_view_profile function with enhanced privacy
DROP FUNCTION IF EXISTS public.can_view_profile(uuid, uuid);

CREATE FUNCTION public.can_view_profile(profile_id uuid, viewing_user_id uuid)
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

-- Recreate the profile policy with enhanced privacy
CREATE POLICY "Users can view profiles based on privacy settings" 
ON public.profiles 
FOR SELECT 
USING (
  CASE
    WHEN (id = auth.uid()) THEN true
    ELSE can_view_profile(id, auth.uid())
  END
);

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