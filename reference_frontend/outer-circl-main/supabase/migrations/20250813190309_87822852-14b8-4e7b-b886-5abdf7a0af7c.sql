-- PHASE 3: Fix Function Search Path Issues (Part 1)
-- Add search path to all security definer functions missing it

-- Fix existing functions that lack proper search_path
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potentially dangerous characters and scripts
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi'),
        '<iframe[^>]*>.*?</iframe>', '', 'gi'
      ),
      '<object[^>]*>.*?</object>', '', 'gi'
    ),
    'javascript:|data:|on\w+\s*=', '', 'gi'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.wants_email_notifications(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT email_notifications 
     FROM public.profile_privacy_settings 
     WHERE user_id = p_user_id), 
    true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1_id AND f.friend_id = user2_id) OR
           (f.user_id = user2_id AND f.friend_id = user1_id))
    AND f.status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_event_participant(p_event_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_user_id 
    AND ep.status = 'attending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_event_host(p_event_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id 
    AND e.host_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.user_can_view_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Users can view events if they are:
  -- 1. The host
  -- 2. A participant
  -- 3. Event is active and public
  RETURN (
    -- Host can always see their events
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = p_event_id AND e.host_id = p_user_id
    )
    OR
    -- Participants can see events they're in
    EXISTS (
      SELECT 1 FROM public.event_participants ep 
      WHERE ep.event_id = p_event_id 
      AND ep.user_id = p_user_id 
      AND ep.status = 'attending'
    )
    OR
    -- Public active events are visible to all authenticated users
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = p_event_id 
      AND e.status = 'active'
      AND e.date >= CURRENT_DATE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';