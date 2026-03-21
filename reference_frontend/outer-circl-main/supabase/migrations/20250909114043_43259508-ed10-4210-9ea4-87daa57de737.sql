-- Security Enhancement: Database Function Hardening - Fix function conflicts
-- Drop and recreate functions with explicit search_path for security

-- Drop existing functions that need to be updated
DROP FUNCTION IF EXISTS public.log_security_event_secure(text,text,uuid,boolean,text);
DROP FUNCTION IF EXISTS public.sanitize_html_input(text);
DROP FUNCTION IF EXISTS public.log_sensitive_access_simple(uuid,text,text,uuid);
DROP FUNCTION IF EXISTS public.check_rate_limit(text,integer,integer);
DROP FUNCTION IF EXISTS public.wants_email_notifications(uuid);
DROP FUNCTION IF EXISTS public.is_friends_with(uuid,uuid);
DROP FUNCTION IF EXISTS public.is_event_host(uuid,uuid);
DROP FUNCTION IF EXISTS public.is_event_participant(uuid,uuid);
DROP FUNCTION IF EXISTS public.is_subscription_admin(uuid,uuid);
DROP FUNCTION IF EXISTS public.is_subscription_member(uuid,uuid);
DROP FUNCTION IF EXISTS public.cleanup_unattended_saved_events();

-- Recreate functions with security hardening
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_success boolean DEFAULT true,
  p_metadata text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    metadata,
    timestamp
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    COALESCE(p_metadata::jsonb, '{}'::jsonb),
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi'),
      '<[^>]*>', '', 'g'
    ),
    '[^\x20-\x7E\x0A\x0D]', '', 'g'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_sensitive_access_simple(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_security_event_secure(
    p_operation || '_' || p_table_name,
    'sensitive_data',
    p_resource_id,
    true,
    jsonb_build_object(
      'table', p_table_name,
      'operation', p_operation,
      'user_id', p_user_id
    )::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  SELECT COUNT(*) INTO current_count
  FROM public.rate_limits rl
  WHERE rl.endpoint = p_endpoint
    AND rl.user_id = auth.uid()
    AND rl.window_start > window_start;
  
  IF current_count < p_max_requests THEN
    INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (auth.uid(), p_endpoint, 1, now())
    ON CONFLICT (user_id, endpoint, window_start) 
    DO UPDATE SET request_count = rate_limits.request_count + 1;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.wants_email_notifications(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT pps.email_notifications 
     FROM public.profile_privacy_settings pps 
     WHERE pps.user_id = wants_email_notifications.user_id),
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1_id AND f.friend_id = user2_id) OR
           (f.user_id = user2_id AND f.friend_id = user1_id))
    AND f.status = 'accepted'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_event_host(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.host_id = user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = event_id 
    AND ep.user_id = user_id 
    AND ep.status = 'attending'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id AND ms.admin_user_id = user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = subscription_id 
    AND ms.user_id = user_id 
    AND ms.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_unattended_saved_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cleanup_count integer := 0;
BEGIN
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
$$;