-- Fix remaining functions with empty or missing search_path
-- This will resolve the remaining "Function Search Path Mutable" warnings

-- Fix check_rate_limit function (there may be multiple with same name)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_key text,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (window_minutes || ' minutes')::interval;
  
  SELECT COUNT(*) INTO attempt_count
  FROM public.rate_limits
  WHERE endpoint = action_key
    AND user_id = auth.uid()
    AND created_at > window_start;
  
  RETURN attempt_count < max_attempts;
END;
$function$;

-- Fix check_user_rating_status function
CREATE OR REPLACE FUNCTION public.check_user_rating_status(p_event_id uuid, p_rated_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if current user can rate the specified user for this event
  IF NOT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = auth.uid() 
    AND ep.status = 'attending'
  ) THEN
    RETURN 'not_participant';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_rated_user_id 
    AND ep.status = 'attending'
  ) THEN
    RETURN 'target_not_participant';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.user_ratings ur
    WHERE ur.event_id = p_event_id
    AND ur.rating_user_id = auth.uid()
    AND ur.rated_user_id = p_rated_user_id
  ) THEN
    RETURN 'already_rated';
  END IF;
  
  RETURN 'can_rate';
END;
$function$;

-- Fix get_personalization_level function
CREATE OR REPLACE FUNCTION public.get_personalization_level(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(personalization_opt, 'full')
  FROM public.profile_privacy_settings
  WHERE user_id = get_personalization_level.user_id;
$function$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Fix is_event_host function
CREATE OR REPLACE FUNCTION public.is_event_host(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = event_id AND host_id = user_id
  );
$function$;

-- Fix is_event_owner function (might be similar to is_event_host)
CREATE OR REPLACE FUNCTION public.is_event_owner(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = event_id AND host_id = user_id
  );
$function$;

-- Fix get_unified_dashboard_data function
CREATE OR REPLACE FUNCTION public.get_unified_dashboard_data()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Return unified dashboard data for authenticated user
  IF auth.uid() IS NULL THEN
    RETURN '{"error": "authentication required"}'::json;
  END IF;
  
  -- Build comprehensive dashboard data
  SELECT json_build_object(
    'user_id', auth.uid(),
    'events', (
      SELECT json_agg(
        json_build_object(
          'id', e.id,
          'title', e.title,
          'date', e.date,
          'time', e.time,
          'location', e.location,
          'category', e.category,
          'status', e.status
        )
      )
      FROM public.events e
      WHERE e.host_id = auth.uid()
      ORDER BY e.date DESC
      LIMIT 10
    ),
    'notifications', (
      SELECT json_agg(
        json_build_object(
          'id', n.id,
          'title', n.title,
          'content', n.content,
          'read_at', n.read_at,
          'created_at', n.created_at
        )
      )
      FROM public.notifications n
      WHERE n.user_id = auth.uid()
      ORDER BY n.created_at DESC
      LIMIT 5
    ),
    'updated_at', now()
  ) INTO result;
  
  RETURN result;
END;
$function$;