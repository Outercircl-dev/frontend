-- Phase 1: Fix Database Function Security Issues
-- Add missing security functions with proper search paths

-- Create log_sensitive_access_simple function
CREATE OR REPLACE FUNCTION public.log_sensitive_access_simple(
  p_user_id UUID,
  p_operation TEXT,
  p_table_name TEXT,
  p_resource_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log sensitive access with enhanced security monitoring
  INSERT INTO public.security_audit_enhanced (
    user_id,
    resource_id,
    action,
    resource_type,
    risk_score,
    metadata,
    timestamp,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_resource_id::UUID,
    p_operation,
    p_table_name,
    CASE 
      WHEN p_table_name IN ('profiles_sensitive', 'payment_metadata') THEN 9
      WHEN p_operation LIKE '%sensitive%' THEN 8
      ELSE 5
    END,
    jsonb_build_object(
      'operation', p_operation,
      'table', p_table_name,
      'timestamp', now(),
      'session_valid', (auth.uid() IS NOT NULL)
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently but log error for monitoring
    RAISE WARNING 'Failed to log sensitive access: %', SQLERRM;
END;
$$;

-- Create enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_requests INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count requests in current window
  SELECT COUNT(*) INTO current_requests
  FROM public.rate_limits
  WHERE user_id = p_user_id::UUID
    AND endpoint = p_endpoint
    AND window_start > window_start;
  
  -- If within limits, record this request
  IF current_requests < p_max_requests THEN
    INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id::UUID, p_endpoint, 1, now())
    ON CONFLICT (user_id, endpoint, window_start) 
    DO UPDATE SET request_count = rate_limits.request_count + 1;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
EXCEPTION
  WHEN OTHERS THEN
    -- On error, allow request but log it
    RAISE WARNING 'Rate limit check failed: %', SQLERRM;
    RETURN TRUE;
END;
$$;

-- Create HTML input sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potentially dangerous HTML tags and scripts
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(input_text, 
            '<script[^>]*>.*?</script>', '', 'gi'),
          '<iframe[^>]*>.*?</iframe>', '', 'gi'),
        '<object[^>]*>.*?</object>', '', 'gi'),
      'javascript:', '', 'gi'),
    'on\w+\s*=', '', 'gi'
  );
END;
$$;

-- Create profile access rate limiting function
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(
  p_user_id UUID,
  p_action_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  access_count INTEGER;
  max_access INTEGER := 20; -- Default limit
BEGIN
  -- Adjust limits based on action type
  CASE p_action_type
    WHEN 'sensitive_data_access' THEN max_access := 5;
    WHEN 'profile_update' THEN max_access := 10;
    WHEN 'payment_access' THEN max_access := 3;
    ELSE max_access := 20;
  END CASE;
  
  -- Check access count in last hour
  SELECT COUNT(*) INTO access_count
  FROM public.sensitive_access_rate_limits
  WHERE user_id = p_user_id
    AND resource_type = p_action_type
    AND window_start > now() - INTERVAL '1 hour';
  
  -- Record this access attempt
  INSERT INTO public.sensitive_access_rate_limits (user_id, resource_type, access_count, window_start)
  VALUES (p_user_id, p_action_type, 1, now())
  ON CONFLICT (user_id, resource_type) 
  DO UPDATE SET 
    access_count = sensitive_access_rate_limits.access_count + 1,
    window_start = CASE 
      WHEN sensitive_access_rate_limits.window_start < now() - INTERVAL '1 hour' 
      THEN now() 
      ELSE sensitive_access_rate_limits.window_start 
    END;
  
  RETURN access_count < max_access;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Profile rate limit check failed: %', SQLERRM;
    RETURN TRUE;
END;
$$;

-- Fix existing functions to have proper search paths
CREATE OR REPLACE FUNCTION public.analyze_security_threats()
RETURNS TABLE(threat_type text, severity text, count bigint, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return high rate limit violations
  RETURN QUERY
  SELECT 
    'rate_limit_violations' as threat_type,
    'high' as severity,
    COUNT(*) as count,
    jsonb_build_object(
      'endpoint', endpoint,
      'violations_per_hour', COUNT(*)
    ) as details
  FROM public.rate_limits
  WHERE window_start > now() - INTERVAL '1 hour'
  GROUP BY endpoint
  HAVING COUNT(*) > 50;
  
  -- Return suspicious login patterns
  RETURN QUERY
  SELECT 
    'suspicious_logins' as threat_type,
    'medium' as severity,
    COUNT(*) as count,
    jsonb_build_object(
      'failed_attempts', COUNT(*),
      'time_window', '1 hour'
    ) as details
  FROM public.security_audit_log
  WHERE action = 'login'
    AND success = false
    AND created_at > now() - INTERVAL '1 hour'
  GROUP BY user_id
  HAVING COUNT(*) > 5;
  
  -- Return account creation anomalies
  RETURN QUERY
  SELECT 
    'account_creation_spike' as threat_type,
    'medium' as severity,
    COUNT(*) as count,
    jsonb_build_object(
      'accounts_created', COUNT(*),
      'time_window', '1 hour'
    ) as details
  FROM public.profiles
  WHERE created_at > now() - INTERVAL '1 hour'
  GROUP BY DATE_TRUNC('hour', created_at)
  HAVING COUNT(*) > 10;
END;
$$;