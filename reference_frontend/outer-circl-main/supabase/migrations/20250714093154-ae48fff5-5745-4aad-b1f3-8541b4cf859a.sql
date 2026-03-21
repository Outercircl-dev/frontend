-- Security Fix 1: Fix Rate Limiting System
-- Update check_rate_limit function to handle null user_id properly
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_endpoint text DEFAULT 'general',
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries (older than 24 hours)
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
  
  -- Count current requests in window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE endpoint = p_endpoint
    AND window_start >= check_rate_limit.window_start
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND ip_address = p_ip_address) OR
      (p_user_id IS NULL AND p_ip_address IS NULL)
    );
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, ip_address, endpoint, window_start, request_count)
  VALUES (p_user_id, p_ip_address, p_endpoint, now(), 1)
  ON CONFLICT (user_id, ip_address, endpoint, window_start) 
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$$;

-- Security Fix 2: Create function to establish initial admin user
CREATE OR REPLACE FUNCTION public.create_initial_admin(admin_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_user_id uuid;
  existing_admin_count integer;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO existing_admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- Only allow creating initial admin if no admin exists
  IF existing_admin_count > 0 THEN
    RAISE EXCEPTION 'Admin user already exists';
  END IF;
  
  -- Find user by email
  SELECT id INTO admin_user_id
  FROM public.profiles
  WHERE email = admin_email
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Create admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin');
  
  -- Log the action
  PERFORM public.log_security_event(
    'admin_created',
    'user_roles',
    admin_user_id,
    true,
    'Initial admin user created'
  );
  
  RETURN TRUE;
END;
$$;

-- Security Fix 3: Enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.analyze_security_threats()
RETURNS TABLE(
  threat_type text,
  severity text,
  count bigint,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Security Fix 4: Add security event tracking trigger
CREATE OR REPLACE FUNCTION public.track_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log profile updates for audit trail
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
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
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS track_profile_changes_trigger ON public.profiles;
CREATE TRIGGER track_profile_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_profile_changes();