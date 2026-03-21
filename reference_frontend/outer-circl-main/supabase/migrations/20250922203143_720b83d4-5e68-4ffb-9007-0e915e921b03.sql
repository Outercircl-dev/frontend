-- Add Enhanced Security Functions and Monitoring
-- Addresses payment data rate limiting and monitoring

-- 1. Create payment access rate limiting function (if not exists)
CREATE OR REPLACE FUNCTION public.check_payment_access_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  access_count integer;
  max_payment_access_per_hour integer := 10;
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

-- 2. Create security monitoring function for admins
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
  SELECT 
    'Excessive Payment Data Access'::text as breach_type,
    COUNT(DISTINCT user_id)::integer as user_count,
    MAX(timestamp) as last_seen,
    'HIGH'::text as risk
  FROM public.security_audit_enhanced
  WHERE resource_type IN ('payment_metadata', 'profiles_sensitive')
    AND timestamp > now() - interval '24 hours'
    AND risk_score >= 9
  GROUP BY resource_type
  HAVING COUNT(*) > 50
  
  UNION ALL
  
  SELECT 
    'Suspicious Invitation Access'::text as breach_type,
    COUNT(DISTINCT user_id)::integer as user_count,
    MAX(timestamp) as last_seen,
    'MEDIUM'::text as risk
  FROM public.security_audit_enhanced
  WHERE resource_type = 'invitations'
    AND timestamp > now() - interval '24 hours'
    AND risk_score >= 7
  GROUP BY resource_type
  HAVING COUNT(*) > 100;
END;
$$;

-- 3. Create a secure view for invitations with masked emails
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
    THEN left(email, 2) || '***@' || split_part(email, '@', 2)
    ELSE '***@***'
  END as email_masked,
  email_hash
FROM public.invitations;

-- Grant permissions to the safe view
GRANT SELECT ON public.invitations_safe TO authenticated;

-- 4. Update security configuration
INSERT INTO public.security_config (config_key, config_value, description, updated_by)
VALUES 
  ('payment_access_max_per_hour', '10', 'Maximum payment data access attempts per user per hour', auth.uid()),
  ('sensitive_data_audit_enabled', 'true', 'Enable comprehensive audit logging for sensitive data', auth.uid()),
  ('invitation_creation_rate_limit', '10', 'Maximum invitations a user can create per hour', auth.uid()),
  ('security_monitoring_enabled', 'true', 'Enable real-time security breach monitoring', auth.uid())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = now(),
  updated_by = auth.uid();

-- 5. Add security documentation
COMMENT ON FUNCTION public.check_payment_access_rate_limit IS 'Restrictive rate limiting for payment-related operations - max 10 per hour';
COMMENT ON FUNCTION public.monitor_sensitive_data_breaches IS 'Admin-only function to monitor potential security breaches in sensitive data access';
COMMENT ON VIEW public.invitations_safe IS 'Secure view for invitations with masked email addresses to prevent data harvesting';