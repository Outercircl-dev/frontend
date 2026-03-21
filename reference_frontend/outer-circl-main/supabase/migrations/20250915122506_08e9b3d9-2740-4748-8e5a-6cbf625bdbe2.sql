-- Fix remaining functions to have secure search_path settings
-- This prevents SQL injection vulnerabilities in function execution

-- Update functions that still need search_path fixes without breaking dependencies
CREATE OR REPLACE FUNCTION public.cleanup_unattended_saved_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Added for security
AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Remove saved events for users who never attended any events
  -- but only for events that are now completed
  DELETE FROM public.saved_events
  WHERE id IN (
    SELECT se.id
    FROM public.saved_events se
    JOIN public.events e ON e.id = se.event_id
    WHERE e.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.user_id = se.user_id 
      AND ep.event_id = se.event_id
      AND ep.status = 'attending'
    )
  );
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$;

-- Update monitor_security_events function with proper search_path
CREATE OR REPLACE FUNCTION public.monitor_security_events()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Added for security
AS $$
DECLARE
  security_summary json;
  threat_count integer;
  failed_login_count integer;
  rate_limit_violations integer;
BEGIN
  -- Count active threats
  SELECT count(*) INTO threat_count
  FROM (
    SELECT * FROM public.analyze_security_threats()
  ) threats;
  
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
$$;

-- Verify all critical functions have proper search_path
CREATE OR REPLACE FUNCTION public.check_hosting_limits(p_user_id uuid, p_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public  -- Added for security
AS $$
DECLARE
  user_membership_tier text;
  events_count integer;
  monthly_limit integer;
BEGIN
  -- Get user's membership tier
  SELECT membership_tier INTO user_membership_tier
  FROM public.profiles
  WHERE id = p_user_id;
  
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
$$;