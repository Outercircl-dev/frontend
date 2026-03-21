-- Fix remaining database functions with search path security issues

-- Update wants_email_notifications function with secure search path
CREATE OR REPLACE FUNCTION public.wants_email_notifications(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT email_notifications 
     FROM public.profile_privacy_settings 
     WHERE user_id = p_user_id), 
    true
  );
END;
$function$;

-- Update is_friends_with function with secure search path
CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1_id AND f.friend_id = user2_id) OR 
           (f.user_id = user2_id AND f.friend_id = user1_id))
    AND f.status = 'accepted'
  );
END;
$function$;

-- Update is_event_host function with secure search path
CREATE OR REPLACE FUNCTION public.is_event_host(p_event_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.host_id = p_user_id
  );
END;
$function$;

-- Update is_event_participant function with secure search path
CREATE OR REPLACE FUNCTION public.is_event_participant(p_event_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_user_id 
    AND ep.status = 'attending'
  );
END;
$function$;

-- Update is_subscription_admin function with secure search path
CREATE OR REPLACE FUNCTION public.is_subscription_admin(p_subscription_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = p_subscription_id AND ms.admin_user_id = p_user_id
  );
END;
$function$;

-- Update is_subscription_member function with secure search path
CREATE OR REPLACE FUNCTION public.is_subscription_member(p_subscription_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = p_subscription_id 
    AND ms.user_id = p_user_id 
    AND ms.status = 'active'
  );
END;
$function$;

-- Update can_view_profile function with secure search path
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid, viewer_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  profile_visibility text;
  are_friends boolean := false;
BEGIN
  -- Get profile visibility setting
  SELECT pps.profile_visibility INTO profile_visibility
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = profile_id;
  
  -- Default to 'followers' if no setting exists
  IF profile_visibility IS NULL THEN
    profile_visibility := 'followers';
  END IF;
  
  -- Always allow users to view their own profile
  IF profile_id = viewer_id THEN
    RETURN 'full';
  END IF;
  
  -- Check if they are friends
  SELECT public.is_friends_with(profile_id, viewer_id) INTO are_friends;
  
  -- Determine access level based on visibility and friendship
  CASE profile_visibility
    WHEN 'public' THEN
      RETURN 'full';
    WHEN 'followers' THEN
      IF are_friends THEN
        RETURN 'full';
      ELSE
        RETURN 'basic';
      END IF;
    WHEN 'private' THEN
      IF are_friends THEN
        RETURN 'full';
      ELSE
        RETURN 'none';
      END IF;
    ELSE
      RETURN 'none';
  END CASE;
END;
$function$;

-- Update cleanup_unattended_saved_events function with secure search path
CREATE OR REPLACE FUNCTION public.cleanup_unattended_saved_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Remove saved events for completed events where user didn't attend
  DELETE FROM public.saved_events se
  WHERE EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = se.event_id
    AND e.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = e.id
      AND ep.user_id = se.user_id
      AND ep.status = 'attending'
    )
  );
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$function$;