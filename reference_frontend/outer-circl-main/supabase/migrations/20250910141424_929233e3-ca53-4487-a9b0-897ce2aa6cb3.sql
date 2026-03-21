-- FIX CRITICAL SECURITY ISSUES
-- Fix ERROR: Security Definer View and WARN: Function Search Path issues

-- Drop and recreate the security dashboard view without security definer implications
DROP VIEW IF EXISTS public.security_dashboard_view;

-- Create a safer security dashboard view that doesn't use security definer
CREATE VIEW public.security_dashboard_view 
WITH (security_invoker = true) AS
SELECT 
  'total_audit_events' as metric,
  COUNT(*)::text as value,
  'INFO' as severity,
  NOW() as last_updated
FROM public.security_audit_immutable
WHERE timestamp > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'locked_accounts' as metric,
  COUNT(*)::text as value,
  CASE WHEN COUNT(*) > 0 THEN 'HIGH' ELSE 'INFO' END as severity,
  NOW() as last_updated
FROM public.account_security_status
WHERE is_locked = true

UNION ALL

SELECT 
  'high_risk_events' as metric,
  COUNT(*)::text as value,
  CASE WHEN COUNT(*) > 10 THEN 'HIGH' WHEN COUNT(*) > 5 THEN 'MEDIUM' ELSE 'LOW' END as severity,
  NOW() as last_updated
FROM public.security_audit_immutable
WHERE risk_score >= 7 AND timestamp > NOW() - INTERVAL '1 hour';

-- Fix WARN: Function Search Path Mutable issues
-- Update all functions to have SET search_path = public

-- Fix generate_audit_hash function
CREATE OR REPLACE FUNCTION public.generate_audit_hash(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_timestamp TIMESTAMPTZ,
  p_ip_address INET
) RETURNS TEXT AS $$
BEGIN
  -- Generate SHA256 hash of critical audit data
  RETURN encode(
    digest(
      COALESCE(p_user_id::text, '') || '|' ||
      p_action || '|' ||
      p_resource_type || '|' ||
      EXTRACT(EPOCH FROM p_timestamp)::text || '|' ||
      COALESCE(p_ip_address::text, '') || '|' ||
      extract(epoch from now())::text, -- Add server timestamp to prevent replay
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix log_security_event_immutable function
CREATE OR REPLACE FUNCTION public.log_security_event_immutable(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_risk_score INTEGER DEFAULT 1,
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
  v_audit_hash TEXT;
  v_user_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
  v_session_id TEXT;
BEGIN
  v_user_id := auth.uid();
  v_ip_address := inet_client_addr();
  
  -- Safely extract user agent and session info
  BEGIN
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    v_session_id := substr(current_setting('request.headers', true)::json->>'authorization', 1, 20);
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := 'unknown';
    v_session_id := 'unknown';
  END;
  
  -- Generate tamper-proof hash
  v_audit_hash := public.generate_audit_hash(
    v_user_id,
    p_action,
    p_resource_type,
    NOW(),
    v_ip_address
  );
  
  -- Insert into immutable audit log
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
    session_id,
    audit_hash
  ) VALUES (
    v_user_id,
    p_resource_id,
    p_action,
    p_resource_type,
    p_risk_score,
    p_metadata || jsonb_build_object('server_time', NOW()),
    NOW(),
    v_ip_address,
    v_user_agent,
    v_session_id,
    v_audit_hash
  );
  
  -- Update suspicious activity counter if high risk
  IF p_risk_score >= 7 AND v_user_id IS NOT NULL THEN
    INSERT INTO public.account_security_status (
      user_id, 
      suspicious_activity_count, 
      last_suspicious_activity
    ) VALUES (
      v_user_id, 
      1, 
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      suspicious_activity_count = account_security_status.suspicious_activity_count + 1,
      last_suspicious_activity = NOW(),
      is_locked = CASE 
        WHEN account_security_status.suspicious_activity_count + 1 >= 5 
        THEN true 
        ELSE account_security_status.is_locked 
      END,
      lock_reason = CASE 
        WHEN account_security_status.suspicious_activity_count + 1 >= 5 
        THEN 'Automatic lockdown due to suspicious activity' 
        ELSE account_security_status.lock_reason 
      END,
      locked_at = CASE 
        WHEN account_security_status.suspicious_activity_count + 1 >= 5 
        THEN NOW() 
        ELSE account_security_status.locked_at 
      END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the main operation
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix log_sensitive_access_enhanced function
CREATE OR REPLACE FUNCTION public.log_sensitive_access_enhanced()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all access to sensitive tables with enhanced security
  PERFORM public.log_security_event_immutable(
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_TABLE_NAME IN ('payment_metadata', 'profiles_sensitive') THEN 9
      WHEN TG_OP = 'DELETE' THEN 8
      ELSE 5
    END,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW(),
      'session_authenticated', auth.uid() IS NOT NULL,
      'row_owner', CASE 
        WHEN TG_TABLE_NAME = 'payment_metadata' THEN COALESCE(NEW.user_id, OLD.user_id)::text
        WHEN TG_TABLE_NAME = 'profiles_sensitive' THEN COALESCE(NEW.id, OLD.id)::text
        ELSE 'unknown'
      END
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix check_account_security_status function
CREATE OR REPLACE FUNCTION public.check_account_security_status(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_locked BOOLEAN := false;
BEGIN
  SELECT is_locked INTO v_is_locked
  FROM public.account_security_status
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_is_locked, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Grant permissions to the new secure view
GRANT SELECT ON public.security_dashboard_view TO authenticated;

-- Success message
SELECT 'Critical security issues fixed successfully' AS status;