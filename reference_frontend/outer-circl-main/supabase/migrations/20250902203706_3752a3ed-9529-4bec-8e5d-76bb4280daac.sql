-- Final fix for Function Search Path Mutable security warning
-- Set search_path to empty string for maximum security on remaining functions

-- Update all remaining functions to use empty search_path for maximum security
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid DEFAULT NULL::uuid, p_ip_address inet DEFAULT NULL::inet, p_endpoint text DEFAULT 'general'::text, p_max_requests integer DEFAULT 100, p_window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries (older than 24 hours)
  DELETE FROM public.rate_limits 
  WHERE rate_limits.window_start < now() - INTERVAL '24 hours';
  
  -- Count current requests in window
  SELECT COALESCE(SUM(rl.request_count), 0) INTO current_count
  FROM public.rate_limits rl
  WHERE rl.endpoint = p_endpoint
    AND rl.window_start >= window_start_time
    AND (
      (p_user_id IS NOT NULL AND rl.user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND rl.ip_address = p_ip_address) OR
      (p_user_id IS NULL AND p_ip_address IS NULL)
    );
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request (now with proper unique constraint)
  INSERT INTO public.rate_limits (user_id, ip_address, endpoint, window_start, request_count)
  VALUES (p_user_id, p_ip_address, p_endpoint, date_trunc('minute', now()), 1)
  ON CONFLICT (user_id, ip_address, endpoint, window_start) 
  DO UPDATE SET request_count = public.rate_limits.request_count + 1;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block event discovery
    RAISE WARNING 'Rate limiting error: %', SQLERRM;
    RETURN TRUE; -- Allow discovery to continue on rate limiting errors
END;
$function$;

-- Update the is_username_unique function
CREATE OR REPLACE FUNCTION public.is_username_unique(new_username text, user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = new_username 
    AND (user_id IS NULL OR id != user_id)
  );
$function$;

-- Update allows_ad_personalization function
CREATE OR REPLACE FUNCTION public.allows_ad_personalization(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(ad_personalization, true)
  FROM public.profile_privacy_settings
  WHERE user_id = allows_ad_personalization.user_id;
$function$;

-- Update get_personalization_level function
CREATE OR REPLACE FUNCTION public.get_personalization_level(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(personalization_opt, 'full')
  FROM public.profile_privacy_settings
  WHERE user_id = get_personalization_level.user_id;
$function$;

-- Update can_show_recommendations function  
CREATE OR REPLACE FUNCTION public.can_show_recommendations(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT public.get_personalization_level(p_user_id) = 'full';
$function$;

-- Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;