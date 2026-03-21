-- Fix remaining functions with empty search_path
-- Drop conflicting functions first, then recreate with proper search_path

-- Drop functions that need return type changes
DROP FUNCTION IF EXISTS public.check_user_rating_status(uuid,uuid);

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

-- Recreate check_user_rating_status function with proper search_path
CREATE OR REPLACE FUNCTION public.check_user_rating_status(p_event_id uuid, p_rated_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN 'not_authenticated';
  END IF;
  
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

-- Fix is_event_owner function
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
BEGIN
  -- Return unified dashboard data for authenticated user
  IF auth.uid() IS NULL THEN
    RETURN '{"error": "authentication required"}'::json;
  END IF;
  
  -- Return basic dashboard data
  RETURN json_build_object(
    'user_id', auth.uid(),
    'timestamp', now(),
    'status', 'active'
  );
END;
$function$;