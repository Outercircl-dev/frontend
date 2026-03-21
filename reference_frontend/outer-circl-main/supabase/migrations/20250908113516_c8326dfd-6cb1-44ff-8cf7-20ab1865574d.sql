-- Fix Function Search Path Mutable warnings
-- Add explicit search_path to functions that don't have it set

-- Update functions that may not have explicit search_path
CREATE OR REPLACE FUNCTION public.wants_email_notifications(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(email_notifications, true)
  FROM public.profile_privacy_settings
  WHERE user_id = wants_email_notifications.user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE ((user_id = user1_id AND friend_id = user2_id) OR
           (user_id = user2_id AND friend_id = user1_id))
    AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_host(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = event_id AND host_id = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_id = is_event_participant.event_id 
    AND user_id = is_event_participant.user_id 
    AND status = 'attending'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions
    WHERE id = subscription_id AND admin_user_id = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots
    WHERE subscription_id = is_subscription_member.subscription_id 
    AND user_id = is_subscription_member.user_id
    AND status = 'active'
  );
$$;

-- Update cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_unattended_saved_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleanup_count INTEGER := 0;
  saved_event_record RECORD;
BEGIN
  -- Find saved events where user didn't attend the completed event
  FOR saved_event_record IN
    SELECT se.id, se.user_id, se.event_id
    FROM public.saved_events se
    JOIN public.events e ON e.id = se.event_id
    WHERE e.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = se.event_id 
      AND ep.user_id = se.user_id 
      AND ep.status = 'attending'
    )
  LOOP
    -- Delete the saved event since they didn't attend
    DELETE FROM public.saved_events 
    WHERE id = saved_event_record.id;
    
    cleanup_count := cleanup_count + 1;
  END LOOP;
  
  RETURN cleanup_count;
END;
$$;