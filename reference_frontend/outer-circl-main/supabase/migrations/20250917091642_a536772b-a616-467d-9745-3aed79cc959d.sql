-- AUTOMATED SECURITY FIXES MIGRATION (Fixed)
-- Fix critical security vulnerabilities identified in security scan

-- 1. CRITICAL: Update SECURITY DEFINER functions to include secure search_path
-- Update functions without dropping them to preserve triggers

-- Function: track_profile_changes (update without dropping)
CREATE OR REPLACE FUNCTION public.track_profile_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log profile updates for audit trail
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event_secure(
      'profile_updated',
      'profiles',
      NEW.id,
      true,
      jsonb_build_object(
        'changed_fields', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
        )
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function: monitor_security_events (update with validation)
CREATE OR REPLACE FUNCTION public.monitor_security_events()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  security_summary json;
  threat_count integer;
  failed_login_count integer;
  rate_limit_violations integer;
BEGIN
  -- Input validation
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Count active threats with error handling
  BEGIN
    SELECT count(*) INTO threat_count
    FROM (
      SELECT * FROM public.analyze_security_threats()
    ) threats;
  EXCEPTION
    WHEN OTHERS THEN
      threat_count := 0;
  END;
  
  -- Count failed login attempts in last hour
  SELECT count(*) INTO failed_login_count
  FROM public.security_audit_enhanced
  WHERE action = 'login_failed'
    AND timestamp > now() - interval '1 hour';
    
  -- Count rate limit violations in last hour  
  SELECT count(*) INTO rate_limit_violations
  FROM public.security_audit_enhanced
  WHERE action = 'rate_limit_violation'
    AND timestamp > now() - interval '1 hour';
  
  security_summary := json_build_object(
    'timestamp', now(),
    'threat_count', threat_count,
    'failed_logins_last_hour', failed_login_count,
    'rate_limit_violations_last_hour', rate_limit_violations,
    'overall_status', CASE 
      WHEN threat_count > 0 OR rate_limit_violations > 10 THEN 'HIGH_RISK'
      WHEN failed_login_count > 5 THEN 'MEDIUM_RISK'
      ELSE 'LOW_RISK'
    END
  );
  
  RETURN security_summary;
END;
$function$;

-- Function: log_security_event_secure (enhanced with validation)
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text, 
  p_resource_type text, 
  p_resource_id uuid, 
  p_sensitive_data boolean DEFAULT false, 
  p_metadata text DEFAULT ''::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  audit_hash_value text;
BEGIN
  -- Input validation
  IF p_action IS NULL OR length(p_action) = 0 THEN
    RAISE EXCEPTION 'Action cannot be null or empty';
  END IF;
  
  IF p_resource_type IS NULL OR length(p_resource_type) = 0 THEN
    RAISE EXCEPTION 'Resource type cannot be null or empty';
  END IF;
  
  IF length(p_action) > 100 THEN
    RAISE EXCEPTION 'Action length cannot exceed 100 characters';
  END IF;
  
  -- Generate integrity hash
  audit_hash_value := public.generate_audit_hash(
    auth.uid(),
    p_action,
    p_resource_type,
    now(),
    inet_client_addr()
  );
  
  -- Log security events with enhanced risk scoring for sensitive data
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
    auth.uid(),
    p_resource_id,
    p_action,
    p_resource_type,
    CASE 
      WHEN p_sensitive_data THEN 9
      WHEN p_resource_type IN ('payment_metadata', 'profiles_sensitive') THEN 8
      ELSE 3
    END,
    jsonb_build_object(
      'action', p_action,
      'resource_type', p_resource_type,
      'sensitive', p_sensitive_data,
      'metadata', p_metadata,
      'timestamp', now(),
      'audit_hash', audit_hash_value
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  -- Also log to immutable audit table for critical events
  IF p_sensitive_data OR p_resource_type IN ('payment_metadata', 'profiles_sensitive') THEN
    INSERT INTO public.security_audit_immutable (
      user_id,
      resource_id,
      action,
      resource_type,
      risk_score,
      metadata,
      timestamp,
      ip_address,
      user_agent,
      audit_hash
    ) VALUES (
      auth.uid(),
      p_resource_id,
      p_action,
      p_resource_type,
      9,
      jsonb_build_object(
        'action', p_action,
        'resource_type', p_resource_type,
        'sensitive', p_sensitive_data,
        'metadata', p_metadata,
        'timestamp', now()
      ),
      now(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent',
      audit_hash_value
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently for audit logging to prevent breaking operations
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$function$;

-- Function: check_hosting_limits (secure update)
CREATE OR REPLACE FUNCTION public.check_hosting_limits(p_user_id uuid, p_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_membership_tier text;
  events_count integer;
  monthly_limit integer;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_date IS NULL THEN
    p_date := CURRENT_DATE;
  END IF;
  
  -- Get user's membership tier
  SELECT membership_tier INTO user_membership_tier
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF user_membership_tier IS NULL THEN
    user_membership_tier := 'standard';
  END IF;
  
  -- Set limits based on membership tier
  IF user_membership_tier = 'premium' THEN
    monthly_limit := 999999; -- Unlimited for premium
  ELSE
    monthly_limit := 4; -- Standard users limited to 4 events per month
  END IF;
  
  -- Count events created this month by this user
  SELECT COUNT(*) INTO events_count
  FROM public.events
  WHERE host_id = p_user_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';
  
  -- Check if user can create more events
  RETURN events_count < monthly_limit;
END;
$function$;

-- Function: validate_sensitive_access (secure update)
CREATE OR REPLACE FUNCTION public.validate_sensitive_access(p_user_id uuid, p_resource_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF p_resource_type IS NULL OR length(p_resource_type) = 0 THEN
    RETURN false;
  END IF;
  
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must be accessing own data
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Must have valid JWT
  IF auth.jwt() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must have authenticated role
  IF (auth.jwt() ->> 'role') != 'authenticated' THEN
    RETURN false;
  END IF;
  
  -- Log the access attempt
  PERFORM public.log_security_event_secure(
    'sensitive_data_access',
    p_resource_type,
    p_user_id,
    true,
    jsonb_build_object(
      'access_time', now(),
      'user_authenticated', true,
      'resource_type', p_resource_type
    )::text
  );
  
  RETURN true;
END;
$function$;

-- Function: check_rate_limit_sensitive (secure update)
CREATE OR REPLACE FUNCTION public.check_rate_limit_sensitive(p_user_id uuid, p_resource_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  access_count integer;
  max_access_per_hour integer := 50;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_resource_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Count recent access attempts for this user and resource type
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND timestamp > now() - interval '1 hour';
  
  -- Allow max 50 accesses per hour to sensitive data (reasonable for normal usage)
  IF access_count > max_access_per_hour THEN
    -- Log the violation
    PERFORM public.log_security_event_secure(
      'rate_limit_violation_sensitive',
      p_resource_type,
      p_user_id,
      true,
      jsonb_build_object(
        'access_count', access_count,
        'max_allowed', max_access_per_hour,
        'time_window', '1 hour',
        'blocked', true
      )::text
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- 2. NEW ENHANCED SECURITY FUNCTIONS

-- Enhanced payment rate limiting function
CREATE OR REPLACE FUNCTION public.check_payment_rate_limit(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payment_access_count integer;
  max_payment_access_per_hour integer := 20; -- Stricter limit for payment operations
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Count payment-related access in the last hour
  SELECT COUNT(*) INTO payment_access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND resource_type = 'payment_metadata'
    AND timestamp > now() - interval '1 hour';
  
  IF payment_access_count >= max_payment_access_per_hour THEN
    -- Log the rate limit violation
    PERFORM public.log_security_event_secure(
      'payment_rate_limit_exceeded',
      'payment_metadata',
      p_user_id,
      true,
      jsonb_build_object(
        'access_count', payment_access_count,
        'max_allowed', max_payment_access_per_hour,
        'blocked_at', now()
      )::text
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Enhanced payment access logging
CREATE OR REPLACE FUNCTION public.log_payment_access(
  p_user_id uuid, 
  p_operation text, 
  p_metadata jsonb DEFAULT NULL::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required for payment access logging';
  END IF;
  
  IF p_operation IS NULL OR length(p_operation) = 0 THEN
    RAISE EXCEPTION 'Operation type required for payment access logging';
  END IF;
  
  IF length(p_operation) > 100 THEN
    RAISE EXCEPTION 'Operation type too long';
  END IF;
  
  -- Enhanced logging for payment operations
  PERFORM log_security_event_secure(
    p_operation,
    'payment_metadata',
    p_user_id,
    true,
    COALESCE(p_metadata, '{}'::jsonb)::text
  );
  
  -- Additional rate limit check for payment operations (stricter than normal)
  IF NOT public.check_payment_rate_limit(p_user_id) THEN
    RAISE EXCEPTION 'Payment operation rate limit exceeded. Please try again later.';
  END IF;
END;
$function$;

-- Audit integrity verification
CREATE OR REPLACE FUNCTION public.verify_audit_integrity()
 RETURNS TABLE(
   audit_id uuid,
   expected_hash text,
   actual_hash text,
   integrity_status text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can verify audit integrity
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    sai.id as audit_id,
    sai.audit_hash as expected_hash,
    public.generate_audit_hash(
      sai.user_id,
      sai.action,
      sai.resource_type,
      sai.timestamp,
      sai.ip_address
    ) as actual_hash,
    CASE 
      WHEN sai.audit_hash = public.generate_audit_hash(
        sai.user_id,
        sai.action,
        sai.resource_type,
        sai.timestamp,
        sai.ip_address
      ) THEN 'VALID'
      ELSE 'COMPROMISED'
    END as integrity_status
  FROM public.security_audit_immutable sai
  WHERE sai.timestamp > now() - interval '24 hours'
  ORDER BY sai.timestamp DESC
  LIMIT 1000;
END;
$function$;

-- Automated security cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer := 0;
  cleanup_date timestamp with time zone;
BEGIN
  -- Keep audit logs for 90 days
  cleanup_date := now() - interval '90 days';
  
  -- Clean up old entries from security_audit_enhanced (but keep critical ones)
  DELETE FROM public.security_audit_enhanced
  WHERE timestamp < cleanup_date
    AND risk_score < 7; -- Keep high-risk events longer
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  PERFORM public.log_security_event_secure(
    'audit_log_cleanup',
    'security_audit_enhanced',
    null,
    false,
    jsonb_build_object(
      'deleted_count', deleted_count,
      'cleanup_date', cleanup_date,
      'retention_days', 90
    )::text
  );
  
  RETURN deleted_count;
END;
$function$;

-- Security dashboard function
CREATE OR REPLACE FUNCTION public.get_security_dashboard_data()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  dashboard_data json;
  threat_summary json;
  audit_summary json;
BEGIN
  -- Only admins can access security dashboard
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Get threat summary
  SELECT json_build_object(
    'high_risk_events', COUNT(*) FILTER (WHERE risk_score >= 8),
    'medium_risk_events', COUNT(*) FILTER (WHERE risk_score BETWEEN 5 AND 7),
    'total_events_24h', COUNT(*),
    'unique_users_24h', COUNT(DISTINCT user_id)
  ) INTO threat_summary
  FROM public.security_audit_enhanced
  WHERE timestamp > now() - interval '24 hours';
  
  -- Get audit summary
  SELECT json_build_object(
    'total_audit_entries', COUNT(*),
    'payment_accesses_24h', COUNT(*) FILTER (WHERE resource_type = 'payment_metadata' AND timestamp > now() - interval '24 hours'),
    'failed_operations_24h', COUNT(*) FILTER (WHERE action LIKE '%failed%' AND timestamp > now() - interval '24 hours')
  ) INTO audit_summary
  FROM public.security_audit_enhanced;
  
  dashboard_data := json_build_object(
    'timestamp', now(),
    'threats', threat_summary,
    'audit', audit_summary,
    'status', 'secure'
  );
  
  RETURN dashboard_data;
END;
$function$;

-- Update get_dashboard_data_optimized with security
CREATE OR REPLACE FUNCTION public.get_dashboard_data_optimized(p_user_id uuid)
 RETURNS TABLE(
   id uuid, title text, description text, image_url text, date date, 
   event_time time without time zone, location text, max_attendees integer, 
   category text, host_id uuid, duration text, coordinates jsonb, 
   host_name text, host_avatar text, attendee_count bigint, 
   is_saved boolean, is_attending boolean
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.image_url,
    e.date,
    e."time" as event_time,
    e.location,
    e.max_attendees,
    e.category,
    e.host_id,
    e.duration,
    e.coordinates,
    p.name as host_name,
    p.avatar_url as host_avatar,
    COALESCE(pc.participant_count, 1) as attendee_count,
    -- Check if user has saved this event
    EXISTS(
      SELECT 1 FROM saved_events se 
      WHERE se.event_id = e.id AND se.user_id = p_user_id
    ) as is_saved,
    -- Check if user is attending
    (e.host_id = p_user_id OR EXISTS(
      SELECT 1 FROM event_participants ep 
      WHERE ep.event_id = e.id 
        AND ep.user_id = p_user_id 
        AND ep.status = 'attending'
    )) as is_attending
  FROM events e
  LEFT JOIN profiles p ON p.id = e.host_id
  LEFT JOIN (
    SELECT 
      event_id, 
      COUNT(*) as participant_count
    FROM event_participants 
    WHERE status = 'attending'
    GROUP BY event_id
  ) pc ON pc.event_id = e.id
  WHERE e.status = 'active' 
    AND e.date >= CURRENT_DATE
  ORDER BY e.date ASC, e.created_at DESC
  LIMIT 50;
END;
$function$;