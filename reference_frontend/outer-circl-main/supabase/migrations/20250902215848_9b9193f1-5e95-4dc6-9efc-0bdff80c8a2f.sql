-- Drop and recreate functions that don't have RLS dependencies
-- Keep is_event_participant and is_event_host as they're used by policies

DROP FUNCTION IF EXISTS public.can_view_event_details(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_user_rating_status(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_event_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.leave_event(uuid);

-- Recreate can_view_event_details function
CREATE OR REPLACE FUNCTION public.can_view_event_details(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Allow if user is the host
  IF EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = p_event_id AND e.host_id = p_user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Allow if user is a confirmed participant
  IF EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_user_id 
    AND ep.status = 'attending'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Recreate check_user_rating_status function
CREATE OR REPLACE FUNCTION public.check_user_rating_status(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_ratings ur
    WHERE ur.event_id = p_event_id AND ur.rating_user_id = p_user_id
  );
$function$;

-- Recreate is_event_owner function
CREATE OR REPLACE FUNCTION public.is_event_owner(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.host_id = p_user_id
  );
$function$;

-- Recreate leave_event function with proper aliases
CREATE OR REPLACE FUNCTION public.leave_event(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  participant_count INTEGER;
  event_host_id UUID;
BEGIN
  -- Get the event host
  SELECT e.host_id INTO event_host_id
  FROM public.events e
  WHERE e.id = p_event_id;
  
  -- Don't allow host to leave their own event
  IF event_host_id = auth.uid() THEN
    RAISE EXCEPTION 'Event host cannot leave their own event';
  END IF;
  
  -- Remove user from participants
  DELETE FROM public.event_participants ep
  WHERE ep.event_id = p_event_id 
  AND ep.user_id = auth.uid();
  
  -- Check if any participants left
  SELECT COUNT(*) INTO participant_count
  FROM public.event_participants ep
  WHERE ep.event_id = p_event_id 
  AND ep.status = 'attending';
  
  -- Send notification to event host
  INSERT INTO public.notifications (
    user_id,
    title,
    content,
    notification_type,
    metadata
  )
  SELECT 
    e.host_id,
    'Participant Left',
    COALESCE(p.name, p.username) || ' left your event "' || e.title || '"',
    'event',
    jsonb_build_object(
      'event_id', p_event_id,
      'event_title', e.title,
      'left_by', auth.uid()
    )
  FROM public.events e
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE e.id = p_event_id;
  
  RETURN true;
END;
$function$;