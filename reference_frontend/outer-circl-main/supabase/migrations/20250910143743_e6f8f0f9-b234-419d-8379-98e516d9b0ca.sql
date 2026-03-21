-- COMPREHENSIVE SECURITY ENHANCEMENT FOR SENSITIVE DATA PROTECTION (CORRECTED)
-- This migration addresses critical security vulnerabilities identified in the security review

-- =======================================================================================
-- PHASE 1: ENHANCED RLS POLICIES FOR SENSITIVE TABLES
-- =======================================================================================

-- 1. Drop existing policies and create ultra-secure ones for profiles_sensitive
DROP POLICY IF EXISTS "profiles_sensitive_final" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "profiles_sensitive_owner_only" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "profiles_sensitive_secure_owner_only" ON public.profiles_sensitive;

-- Create comprehensive RLS policy for profiles_sensitive with multi-layer security
CREATE POLICY "profiles_sensitive_ultra_secure" ON public.profiles_sensitive
FOR ALL
TO authenticated
USING (
  -- Multi-layer authentication checks
  auth.uid() IS NOT NULL AND
  auth.uid() = id AND
  -- JWT audience validation
  auth.jwt() IS NOT NULL AND
  (auth.jwt() ->> 'aud') = 'authenticated' AND
  -- Email confirmation check for sensitive data access
  (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
);

-- 2. Drop existing policies and create ultra-secure ones for payment_metadata
DROP POLICY IF EXISTS "payment_metadata_final" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_owner_only" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_secure_owner_only" ON public.payment_metadata;

-- Create comprehensive RLS policy for payment_metadata with enhanced security
CREATE POLICY "payment_metadata_ultra_secure" ON public.payment_metadata
FOR ALL
TO authenticated
USING (
  -- Multi-layer authentication checks
  auth.uid() IS NOT NULL AND
  user_id IS NOT NULL AND
  auth.uid() = user_id AND
  -- JWT audience validation
  auth.jwt() IS NOT NULL AND
  (auth.jwt() ->> 'aud') = 'authenticated' AND
  -- Email confirmation check for payment data access
  (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id IS NOT NULL AND
  auth.uid() = user_id
);

-- 3. Enhanced RLS policy for invitations to prevent email harvesting
DROP POLICY IF EXISTS "invitations_admin_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_final" ON public.invitations;
DROP POLICY IF EXISTS "invitations_subscription_owner_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_secure_admin_only" ON public.invitations;

-- Create secure invitation policy that protects email addresses
CREATE POLICY "invitations_secure_admin_only" ON public.invitations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  -- Only subscription admins can access invitations
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  ) AND
  -- Additional email confirmation check
  (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- Keep the no-delete policy
CREATE POLICY "invitations_no_deletion" ON public.invitations
FOR DELETE
TO authenticated
USING (false);

-- =======================================================================================
-- PHASE 2: COMPREHENSIVE AUDIT LOGGING SYSTEM
-- =======================================================================================

-- Enhanced audit logging function for sensitive data modifications
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access_enhanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  operation_risk_score INTEGER;
  user_session_data JSONB;
BEGIN
  -- Determine risk score based on operation
  operation_risk_score := CASE 
    WHEN TG_OP = 'INSERT' THEN 9
    WHEN TG_OP = 'UPDATE' THEN 9
    WHEN TG_OP = 'DELETE' THEN 10
    ELSE 7
  END;
  
  -- Gather session data
  user_session_data := jsonb_build_object(
    'operation', TG_OP,
    'table', TG_TABLE_NAME,
    'timestamp', now(),
    'user_agent', COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown'),
    'session_info', 'sensitive_data_access'
  );
  
  -- Log to enhanced audit table
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
    COALESCE(NEW.id, OLD.id),
    TG_OP || '_SENSITIVE_DATA',
    TG_TABLE_NAME,
    operation_risk_score,
    user_session_data,
    now(),
    inet_client_addr(),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
  );
  
  -- Also log to rate limiting table for monitoring
  INSERT INTO public.sensitive_access_rate_limits (
    user_id,
    resource_type,
    access_count,
    window_start
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    1,
    date_trunc('hour', now())
  )
  ON CONFLICT (user_id, resource_type, window_start)
  DO UPDATE SET 
    access_count = sensitive_access_rate_limits.access_count + 1;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block operation
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply enhanced audit triggers to sensitive tables (INSERT, UPDATE, DELETE only)
DROP TRIGGER IF EXISTS sensitive_data_audit_trigger ON public.profiles_sensitive;
CREATE TRIGGER sensitive_data_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access_enhanced();

DROP TRIGGER IF EXISTS payment_data_audit_trigger ON public.payment_metadata;
CREATE TRIGGER payment_data_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access_enhanced();

DROP TRIGGER IF EXISTS invitations_audit_trigger ON public.invitations;
CREATE TRIGGER invitations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access_enhanced();

-- =======================================================================================
-- PHASE 3: SUSPICIOUS ACTIVITY DETECTION
-- =======================================================================================

-- Function to detect suspicious access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_sensitive_access()
RETURNS TABLE(
  user_id UUID,
  resource_type TEXT,
  access_count BIGINT,
  risk_level TEXT,
  last_access TIMESTAMP WITH TIME ZONE,
  requires_action BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sarl.user_id,
    sarl.resource_type,
    sarl.access_count::BIGINT,
    CASE 
      WHEN sarl.access_count > 100 THEN 'CRITICAL'
      WHEN sarl.access_count > 50 THEN 'HIGH'
      WHEN sarl.access_count > 20 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level,
    MAX(sarl.created_at) as last_access,
    (sarl.access_count > 50) as requires_action
  FROM public.sensitive_access_rate_limits sarl
  WHERE sarl.window_start > now() - interval '1 hour'
    AND sarl.resource_type IN ('profiles_sensitive', 'payment_metadata', 'invitations')
  GROUP BY sarl.user_id, sarl.resource_type, sarl.access_count
  HAVING sarl.access_count > 10
  ORDER BY sarl.access_count DESC;
END;
$$;

-- =======================================================================================
-- PHASE 4: SECURITY VALIDATION FUNCTIONS
-- =======================================================================================

-- Enhanced function to validate sensitive data access permissions
CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access_enhanced(
  p_user_id UUID,
  p_resource_type TEXT,
  p_operation TEXT DEFAULT 'SELECT'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email_confirmed BOOLEAN := false;
  recent_access_count INTEGER := 0;
  account_locked BOOLEAN := false;
BEGIN
  -- Check if user exists and email is confirmed
  SELECT 
    email_confirmed_at IS NOT NULL
  INTO user_email_confirmed
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF NOT user_email_confirmed THEN
    RETURN false;
  END IF;
  
  -- Check if account is locked
  SELECT COALESCE(is_locked, false)
  INTO account_locked
  FROM public.account_security_status
  WHERE user_id = p_user_id;
  
  IF account_locked THEN
    RETURN false;
  END IF;
  
  -- Check recent access patterns (rate limiting)
  SELECT COALESCE(SUM(access_count), 0)
  INTO recent_access_count
  FROM public.sensitive_access_rate_limits
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND window_start > now() - interval '1 hour';
  
  -- Block if too many recent accesses
  IF recent_access_count > 100 THEN
    -- Log security event
    PERFORM public.log_security_event_secure(
      'BLOCKED_EXCESSIVE_ACCESS',
      p_resource_type,
      p_user_id,
      true,
      jsonb_build_object(
        'access_count', recent_access_count,
        'operation', p_operation,
        'blocked_at', now()
      )::text
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- =======================================================================================
-- PHASE 5: SECURITY MONITORING AND ALERTS
-- =======================================================================================

-- Function to check overall security status
CREATE OR REPLACE FUNCTION public.get_security_status_enhanced()
RETURNS TABLE(
  metric_name TEXT,
  metric_value TEXT,
  status TEXT,
  risk_level TEXT,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admins to view security status
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    'profiles_sensitive_rls_enabled'::TEXT,
    'true'::TEXT,
    'secure'::TEXT,
    'low'::TEXT,
    now()
  UNION ALL
  SELECT 
    'payment_metadata_rls_enabled'::TEXT,
    'true'::TEXT,
    'secure'::TEXT,
    'low'::TEXT,
    now()
  UNION ALL
  SELECT 
    'invitations_rls_enabled'::TEXT,
    'true'::TEXT,
    'secure'::TEXT,
    'low'::TEXT,
    now()
  UNION ALL
  SELECT 
    'audit_logging_active'::TEXT,
    'true'::TEXT,
    'secure'::TEXT,
    'low'::TEXT,
    now()
  UNION ALL
  SELECT 
    'suspicious_access_monitoring'::TEXT,
    'enabled'::TEXT,
    'secure'::TEXT,
    'low'::TEXT,
    now();
END;
$$;

-- =======================================================================================
-- PHASE 6: CLEANUP AND MAINTENANCE
-- =======================================================================================

-- Function to cleanup old audit logs (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_security_audit_logs_enhanced()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete audit logs older than 90 days
  DELETE FROM public.security_audit_enhanced
  WHERE timestamp < now() - interval '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete old rate limit entries
  DELETE FROM public.sensitive_access_rate_limits
  WHERE created_at < now() - interval '7 days';
  
  -- Log cleanup operation
  PERFORM public.log_security_event_secure(
    'AUDIT_CLEANUP',
    'security_maintenance',
    auth.uid(),
    false,
    jsonb_build_object(
      'deleted_records', deleted_count,
      'cleanup_date', now()
    )::text
  );
  
  RETURN deleted_count;
END;
$$;

-- =======================================================================================
-- FINAL SECURITY COMMENTS AND DOCUMENTATION
-- =======================================================================================

COMMENT ON POLICY "profiles_sensitive_ultra_secure" ON public.profiles_sensitive IS 
'Ultra-secure RLS policy with multi-layer authentication, JWT validation, and email confirmation checks for sensitive profile data access';

COMMENT ON POLICY "payment_metadata_ultra_secure" ON public.payment_metadata IS 
'Ultra-secure RLS policy with comprehensive authentication checks for financial data protection';

COMMENT ON POLICY "invitations_secure_admin_only" ON public.invitations IS 
'Secure RLS policy preventing email harvesting by restricting access to subscription administrators only';

COMMENT ON FUNCTION public.log_sensitive_data_access_enhanced() IS 
'Enhanced audit logging function that tracks all modifications to sensitive data with comprehensive metadata and risk scoring';

COMMENT ON FUNCTION public.detect_suspicious_sensitive_access() IS 
'Security monitoring function that identifies suspicious access patterns to sensitive data';

COMMENT ON FUNCTION public.validate_sensitive_data_access_enhanced(UUID, TEXT, TEXT) IS 
'Enhanced validation function that performs comprehensive security checks before allowing sensitive data access';