-- Enhanced Security Migration for Critical Issues
-- Addresses payment data and PII exposure vulnerabilities

-- 1. Create enhanced security audit function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access_simple(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert into immutable audit log for sensitive operations
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
    p_user_id,
    p_resource_id,
    p_operation,
    p_table_name,
    10, -- Maximum risk score for sensitive data
    jsonb_build_object(
      'operation', p_operation,
      'table', p_table_name,
      'security_level', 'maximum',
      'timestamp', now()
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    current_setting('request.jwt.claims', true)::json->>'session_id',
    public.generate_audit_hash(
      p_user_id,
      p_operation,
      p_table_name,
      now(),
      inet_client_addr()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Critical: Never fail on audit logging for sensitive data
    RAISE WARNING 'Critical security audit failed for %: %', p_table_name, SQLERRM;
END;
$$;

-- 2. Create additional rate limiting function for payment operations
CREATE OR REPLACE FUNCTION public.check_payment_access_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  access_count integer;
  max_payment_access_per_hour integer := 10; -- Very restrictive for payment data
BEGIN
  -- Count payment-related access in the last hour
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND resource_type IN ('payment_metadata', 'profiles_sensitive')
    AND action IN ('SELECT', 'UPDATE', 'INSERT')
    AND timestamp > now() - interval '1 hour';
  
  -- Allow max 10 payment-related operations per hour
  IF access_count > max_payment_access_per_hour THEN
    -- Log the security violation
    PERFORM public.log_security_event_secure(
      'payment_rate_limit_violation',
      'payment_security',
      p_user_id,
      false,
      jsonb_build_object(
        'access_count', access_count,
        'max_allowed', max_payment_access_per_hour,
        'time_window', '1 hour',
        'blocked', true,
        'severity', 'critical'
      )::text
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 3. Enhanced RLS policy for profiles_sensitive with additional security layers
DROP POLICY IF EXISTS "profiles_sensitive_ultra_secure_access" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_maximum_security_access" 
ON public.profiles_sensitive
FOR ALL
USING (
  -- Multi-layer security validation
  auth.uid() IS NOT NULL
  AND auth.uid() = id
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
  AND auth.email() IS NOT NULL
  AND (auth.jwt() ->> 'session_id') IS NOT NULL
  AND (auth.jwt() ->> 'email_confirmed_at') IS NOT NULL
  -- Enhanced validation functions
  AND validate_sensitive_access(id, 'profiles_sensitive')
  AND check_rate_limit_sensitive(auth.uid(), 'profiles_sensitive')
  AND check_payment_access_rate_limit(auth.uid())
  -- Additional time-based security
  AND (
    EXTRACT(EPOCH FROM (now() - (auth.jwt() ->> 'iat')::int::timestamp)) < 3600 -- Token less than 1 hour old
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = id
  AND validate_sensitive_access(id, 'profiles_sensitive')
  AND check_payment_access_rate_limit(auth.uid())
);

-- 4. Enhanced RLS policy for payment_metadata with stricter controls
DROP POLICY IF EXISTS "payment_metadata_ultra_secure_access" ON public.payment_metadata;

CREATE POLICY "payment_metadata_maximum_security_access"
ON public.payment_metadata
FOR ALL
USING (
  -- Ultra-strict validation for payment data
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
  AND auth.email() IS NOT NULL
  AND (auth.jwt() ->> 'session_id') IS NOT NULL
  AND (auth.jwt() ->> 'email_confirmed_at') IS NOT NULL
  -- Payment-specific validations
  AND validate_sensitive_access(user_id, 'payment_metadata')
  AND check_rate_limit_sensitive(auth.uid(), 'payment_metadata')
  AND check_payment_access_rate_limit(auth.uid())
  -- Time-based restrictions
  AND (
    EXTRACT(EPOCH FROM (now() - (auth.jwt() ->> 'iat')::int::timestamp)) < 1800 -- Token less than 30 minutes old for payments
  )
  -- Business hours restriction for payment access (optional security layer)
  AND (
    EXTRACT(hour FROM now() AT TIME ZONE 'UTC') BETWEEN 6 AND 22 -- Only allow between 6 AM and 10 PM UTC
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND validate_sensitive_access(user_id, 'payment_metadata')
  AND check_payment_access_rate_limit(auth.uid())
);

-- 5. Create trigger for enhanced logging on profiles_sensitive
DROP TRIGGER IF EXISTS log_profiles_sensitive_access ON public.profiles_sensitive;
CREATE TRIGGER log_profiles_sensitive_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

-- 6. Create trigger for enhanced logging on payment_metadata  
DROP TRIGGER IF EXISTS log_payment_metadata_access ON public.payment_metadata;
CREATE TRIGGER log_payment_metadata_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

-- 7. Enhanced RLS policy for invitations to prevent email harvesting
DROP POLICY IF EXISTS "invitations_maximum_security_access" ON public.invitations;

CREATE POLICY "invitations_restricted_access"
ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Admin access to their own subscription invitations
    (EXISTS (
      SELECT 1 FROM public.membership_subscriptions ms
      WHERE ms.id = invitations.subscription_id 
      AND ms.admin_user_id = auth.uid()
    ))
    OR
    -- User can only see their own pending invitations by matching email
    (
      auth.email() = email
      AND status = 'pending'
      AND expires_at > now()
      -- Additional security: limit to recent invitations only
      AND created_at > now() - interval '7 days'
    )
  )
  -- Rate limiting for invitation access
  AND check_rate_limit_sensitive(auth.uid(), 'invitations')
);

-- 8. Remove plain email field exposure - use only encrypted email going forward
-- Add a view that masks sensitive invitation data
CREATE OR REPLACE VIEW public.invitations_safe AS
SELECT 
  id,
  subscription_id,
  slot_id,
  invited_by,
  invitation_token,
  expires_at,
  created_at,
  updated_at,
  status,
  -- Mask email addresses for security
  CASE 
    WHEN auth.uid() = invited_by OR 
         EXISTS (SELECT 1 FROM public.membership_subscriptions ms 
                WHERE ms.id = invitations.subscription_id AND ms.admin_user_id = auth.uid())
    THEN left(email, 3) || '***@' || split_part(email, '@', 2)
    ELSE '***@***'
  END as email_masked,
  email_hash -- Keep hash for verification
FROM public.invitations;

-- 9. Grant appropriate permissions to the safe view
GRANT SELECT ON public.invitations_safe TO authenticated;

-- 10. Create security monitoring function
CREATE OR REPLACE FUNCTION public.monitor_sensitive_data_breaches()
RETURNS TABLE(
  potential_breach_type text,
  affected_users integer,
  last_incident timestamp with time zone,
  risk_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can view breach monitoring
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  WITH breach_analysis AS (
    SELECT 
      'Excessive Payment Data Access' as breach_type,
      COUNT(DISTINCT user_id) as user_count,
      MAX(timestamp) as last_seen,
      'HIGH' as risk
    FROM public.security_audit_enhanced
    WHERE resource_type IN ('payment_metadata', 'profiles_sensitive')
      AND timestamp > now() - interval '24 hours'
      AND risk_score >= 9
    GROUP BY resource_type
    HAVING COUNT(*) > 100
  )
  SELECT * FROM breach_analysis;
END;
$$;

-- 11. Add comment for security documentation
COMMENT ON FUNCTION public.log_sensitive_access_simple IS 'Enhanced security logging for sensitive data operations - logs to immutable audit trail';
COMMENT ON FUNCTION public.check_payment_access_rate_limit IS 'Restrictive rate limiting for payment-related operations - max 10 per hour';
COMMENT ON FUNCTION public.monitor_sensitive_data_breaches IS 'Admin-only function to monitor potential security breaches in sensitive data access';

-- 12. Security configuration update
INSERT INTO public.security_config (config_key, config_value, description, updated_by)
VALUES 
  ('payment_access_max_per_hour', '10', 'Maximum payment data access attempts per user per hour', auth.uid()),
  ('sensitive_data_audit_enabled', 'true', 'Enable comprehensive audit logging for sensitive data', auth.uid()),
  ('payment_token_max_age_minutes', '30', 'Maximum age of JWT token for payment operations in minutes', auth.uid())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = now(),
  updated_by = auth.uid();