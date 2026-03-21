-- PHASE 3 & 4: Fix Extension Security and Remaining Function Issues
-- Move extension from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension (if it exists in public schema)
DO $$
BEGIN
  -- Only attempt to move if extension exists in public schema
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    DROP EXTENSION IF EXISTS pg_net CASCADE;
    CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
  END IF;
END
$$;

-- Update existing functions to add search_path where missing
-- Only update functions that don't have policy dependencies

CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    risk_score,
    timestamp
  ) VALUES (
    auth.uid(),
    p_action,
    COALESCE(p_resource_type, 'unknown'),
    p_resource_id,
    jsonb_build_object(
      'success', p_success,
      'error_message', p_error_message,
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    ),
    CASE 
      WHEN NOT p_success THEN 8
      WHEN p_resource_type IN ('payment_metadata', 'profiles_sensitive') THEN 7
      ELSE 3
    END,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Enhanced rate limiting function with audit logging
CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
  current_count integer;
  is_allowed boolean;
BEGIN
  -- Use existing rate limit function but with enhanced logging
  is_allowed := public.check_rate_limit(
    auth.uid(),
    inet_client_addr(),
    p_endpoint,
    p_max_requests,
    p_window_minutes
  );
  
  -- Log rate limit check
  PERFORM public.log_security_event_secure(
    'rate_limit_check',
    'endpoint',
    NULL,
    is_allowed,
    CASE WHEN NOT is_allowed THEN 'Rate limit exceeded' ELSE NULL END
  );
  
  RETURN is_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.detect_security_anomalies()
RETURNS TABLE(
  anomaly_type text,
  severity text,
  count bigint,
  description text
) AS $$
BEGIN
  -- Detect multiple failed login attempts
  RETURN QUERY
  SELECT 
    'failed_logins'::text,
    'high'::text,
    COUNT(*),
    'Multiple failed login attempts detected in last hour'
  FROM public.security_audit_enhanced
  WHERE action = 'login'
    AND metadata->>'success' = 'false'
    AND timestamp > now() - INTERVAL '1 hour'
  GROUP BY (metadata->>'user_id')
  HAVING COUNT(*) > 5;
  
  -- Detect suspicious data access patterns
  RETURN QUERY
  SELECT 
    'sensitive_data_access'::text,
    'medium'::text,
    COUNT(*),
    'High volume sensitive data access detected'
  FROM public.security_audit_enhanced
  WHERE resource_type IN ('payment_metadata', 'profiles_sensitive')
    AND timestamp > now() - INTERVAL '1 hour'
  GROUP BY user_id
  HAVING COUNT(*) > 20;
  
  -- Detect potential brute force attacks
  RETURN QUERY
  SELECT 
    'brute_force'::text,
    'critical'::text,
    COUNT(*),
    'Potential brute force attack detected'
  FROM public.security_audit_enhanced
  WHERE action = 'access_denied'
    AND timestamp > now() - INTERVAL '10 minutes'
  GROUP BY (metadata->>'ip_address')
  HAVING COUNT(*) > 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';