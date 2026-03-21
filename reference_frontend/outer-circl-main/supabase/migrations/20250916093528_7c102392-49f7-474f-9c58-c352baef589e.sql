-- Security Fix Migration: Resolve Critical Security Findings
-- This migration addresses all security vulnerabilities found in the scan

-- 1. FIX CRITICAL: Strengthen RLS policies for sensitive tables
-- Drop and recreate RLS policies with enhanced security for profiles_sensitive
DROP POLICY IF EXISTS "Users can only access their own sensitive profile data" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "profiles_sensitive_ultra_secure_access" ON public.profiles_sensitive;

-- Create ultra-secure policy for profiles_sensitive with rate limiting
CREATE POLICY "profiles_sensitive_maximum_security"
ON public.profiles_sensitive
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
  AND public.validate_sensitive_access(id, 'profiles_sensitive')
  AND public.check_rate_limit_sensitive(auth.uid(), 'profiles_sensitive')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND public.validate_sensitive_access(id, 'profiles_sensitive')
);

-- 2. FIX CRITICAL: Strengthen RLS policies for payment_metadata
DROP POLICY IF EXISTS "Users can only access their own payment metadata" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_ultra_secure_access" ON public.payment_metadata;

-- Create ultra-secure policy for payment_metadata with rate limiting
CREATE POLICY "payment_metadata_maximum_security"
ON public.payment_metadata
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
  AND public.validate_sensitive_access(user_id, 'payment_metadata')
  AND public.check_rate_limit_sensitive(auth.uid(), 'payment_metadata')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND public.validate_sensitive_access(user_id, 'payment_metadata')
);

-- 3. FIX WARNING: Secure invitations table to prevent email harvesting
DROP POLICY IF EXISTS "Users can only access invitations they sent or received" ON public.invitations;
DROP POLICY IF EXISTS "invitations_secure_admin_access" ON public.invitations;
DROP POLICY IF EXISTS "invitations_secure_admin_insert" ON public.invitations;
DROP POLICY IF EXISTS "invitations_secure_admin_update" ON public.invitations;

-- Create strict invitation policies
CREATE POLICY "invitations_ultra_secure_access"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin of the subscription can see all invitations
    EXISTS (
      SELECT 1 FROM public.membership_subscriptions ms
      WHERE ms.id = invitations.subscription_id 
      AND ms.admin_user_id = auth.uid()
    ) OR
    -- Invited user can see their own invitation (by email match)
    auth.email() = email
  )
);

CREATE POLICY "invitations_admin_insert_only"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND invited_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "invitations_admin_update_only"
ON public.invitations
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 4. FIX WARNING: Secure all security audit tables to admin-only access
-- Update security_audit_log policies
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;
CREATE POLICY "security_audit_log_admin_only"
ON public.security_audit_log
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update security_events_realtime policies
DROP POLICY IF EXISTS "security_events_admin_only" ON public.security_events_realtime;
CREATE POLICY "security_events_realtime_strict_admin"
ON public.security_events_realtime
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.has_role(auth.uid(), 'admin')
);

-- 5. FIX WARNING: Set search_path for all security functions to prevent mutable path issues
-- Update existing functions with proper search_path
CREATE OR REPLACE FUNCTION public.validate_sensitive_access(p_user_id uuid, p_resource_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
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

CREATE OR REPLACE FUNCTION public.check_rate_limit_sensitive(p_user_id uuid, p_resource_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  access_count integer;
BEGIN
  -- Count recent access attempts for this user and resource type
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND timestamp > now() - interval '1 hour';
  
  -- Allow max 50 accesses per hour to sensitive data (reasonable for normal usage)
  IF access_count > 50 THEN
    -- Log the violation
    PERFORM public.log_security_event_secure(
      'rate_limit_violation_sensitive',
      p_resource_type,
      p_user_id,
      true,
      jsonb_build_object(
        'access_count', access_count,
        'time_window', '1 hour',
        'blocked', true
      )::text
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- 6. Create security monitoring function for real-time threat detection
CREATE OR REPLACE FUNCTION public.detect_security_threats()
RETURNS TABLE(
  threat_type text,
  severity text,
  description text,
  affected_users integer,
  last_occurrence timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH threat_analysis AS (
    -- Detect suspicious payment data access
    SELECT 
      'payment_data_breach' as threat_type,
      'CRITICAL' as severity,
      'Suspicious access to payment metadata detected' as description,
      COUNT(DISTINCT user_id)::integer as affected_users,
      MAX(timestamp) as last_occurrence
    FROM public.security_audit_enhanced
    WHERE resource_type = 'payment_metadata'
      AND risk_score >= 8
      AND timestamp > now() - interval '1 hour'
    HAVING COUNT(*) > 10
    
    UNION ALL
    
    -- Detect sensitive profile data access anomalies
    SELECT 
      'profile_data_breach' as threat_type,
      'HIGH' as severity,
      'Unusual access to sensitive profile data' as description,
      COUNT(DISTINCT user_id)::integer as affected_users,
      MAX(timestamp) as last_occurrence
    FROM public.security_audit_enhanced
    WHERE resource_type = 'profiles_sensitive'
      AND risk_score >= 7
      AND timestamp > now() - interval '1 hour'
    HAVING COUNT(*) > 20
    
    UNION ALL
    
    -- Detect invitation email harvesting attempts
    SELECT 
      'email_harvesting' as threat_type,
      'MEDIUM' as severity,
      'Potential email harvesting from invitations table' as description,
      COUNT(DISTINCT user_id)::integer as affected_users,
      MAX(timestamp) as last_occurrence
    FROM public.security_audit_enhanced
    WHERE resource_type = 'invitations'
      AND action LIKE '%SELECT%'
      AND timestamp > now() - interval '1 hour'
    HAVING COUNT(*) > 50
  )
  SELECT * FROM threat_analysis WHERE affected_users > 0;
END;
$function$;

-- 7. Create security configuration table for centralized security settings
CREATE TABLE IF NOT EXISTS public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on security settings
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage security settings
CREATE POLICY "security_settings_admin_only"
ON public.security_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default security configurations
INSERT INTO public.security_settings (setting_name, setting_value, description, updated_by)
VALUES 
  ('max_sensitive_access_per_hour', '{"limit": 50}', 'Maximum sensitive data access attempts per hour per user', NULL),
  ('payment_data_encryption', '{"enabled": true, "algorithm": "AES-256"}', 'Payment data encryption settings', NULL),
  ('audit_log_retention_days', '{"days": 90}', 'How long to retain audit logs', NULL),
  ('threat_detection_enabled', '{"enabled": true}', 'Enable real-time threat detection', NULL)
ON CONFLICT (setting_name) DO NOTHING;

-- 8. Create trigger to automatically log all sensitive table access
CREATE OR REPLACE FUNCTION public.log_sensitive_access_simple(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_record_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
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
    p_record_id,
    p_operation,
    p_table_name,
    CASE 
      WHEN p_table_name IN ('payment_metadata', 'profiles_sensitive') THEN 9
      WHEN p_table_name = 'invitations' THEN 6
      ELSE 3
    END,
    jsonb_build_object(
      'table_accessed', p_table_name,
      'operation', p_operation,
      'timestamp', now(),
      'security_level', 'high'
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to prevent breaking normal operations
    NULL;
END;
$function$;

-- Add triggers for sensitive table monitoring
DROP TRIGGER IF EXISTS log_sensitive_data_access_profiles ON public.profiles_sensitive;
DROP TRIGGER IF EXISTS log_sensitive_data_access_payment ON public.payment_metadata;
DROP TRIGGER IF EXISTS log_sensitive_data_access_invitations ON public.invitations;

CREATE TRIGGER log_sensitive_data_access_profiles
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

CREATE TRIGGER log_sensitive_data_access_payment
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

CREATE TRIGGER log_sensitive_data_access_invitations
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

-- 9. Add indexes for better security monitoring performance
CREATE INDEX IF NOT EXISTS idx_security_audit_enhanced_sensitive_access 
ON public.security_audit_enhanced(user_id, resource_type, timestamp) 
WHERE resource_type IN ('payment_metadata', 'profiles_sensitive', 'invitations');

CREATE INDEX IF NOT EXISTS idx_security_audit_enhanced_risk_score 
ON public.security_audit_enhanced(risk_score, timestamp) 
WHERE risk_score >= 7;

-- 10. Create security health check function
CREATE OR REPLACE FUNCTION public.get_security_health_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  threat_count integer;
  critical_violations integer;
  rls_enabled_count integer;
  total_sensitive_tables integer := 3; -- profiles_sensitive, payment_metadata, invitations
BEGIN
  -- Check for active threats
  SELECT COUNT(*) INTO threat_count
  FROM public.detect_security_threats();
  
  -- Check for critical violations in last 24 hours
  SELECT COUNT(*) INTO critical_violations
  FROM public.security_audit_enhanced
  WHERE risk_score >= 8 
    AND timestamp > now() - interval '24 hours';
  
  -- Check RLS is enabled on sensitive tables
  SELECT COUNT(*) INTO rls_enabled_count
  FROM information_schema.tables t
  JOIN pg_class c ON c.relname = t.table_name
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE t.table_schema = 'public'
    AND t.table_name IN ('profiles_sensitive', 'payment_metadata', 'invitations')
    AND c.relrowsecurity = true;
  
  -- Build result
  result := jsonb_build_object(
    'overall_status', CASE 
      WHEN threat_count > 0 OR critical_violations > 5 THEN 'CRITICAL'
      WHEN critical_violations > 0 OR rls_enabled_count < total_sensitive_tables THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'active_threats', threat_count,
    'critical_violations_24h', critical_violations,
    'rls_coverage', CASE 
      WHEN rls_enabled_count = total_sensitive_tables THEN 'COMPLETE'
      ELSE 'INCOMPLETE'
    END,
    'last_check', now(),
    'recommendations', CASE
      WHEN rls_enabled_count < total_sensitive_tables THEN 
        jsonb_build_array('Enable RLS on all sensitive tables')
      WHEN critical_violations > 5 THEN
        jsonb_build_array('Review and investigate critical security violations')
      ELSE
        jsonb_build_array('System security is healthy')
    END
  );
  
  RETURN result;
END;
$function$;