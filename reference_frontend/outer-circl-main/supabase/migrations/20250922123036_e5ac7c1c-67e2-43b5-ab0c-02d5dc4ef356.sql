-- Fix remaining database functions with search path security issues
-- Drop and recreate functions to avoid parameter name conflicts

DROP FUNCTION IF EXISTS public.wants_email_notifications(uuid);
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

DROP FUNCTION IF EXISTS public.is_friends_with(uuid, uuid);
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

DROP FUNCTION IF EXISTS public.is_event_host(uuid, uuid);
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

DROP FUNCTION IF EXISTS public.is_event_participant(uuid, uuid);
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