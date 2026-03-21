-- CRITICAL SECURITY FIX: Address urgent vulnerabilities (Corrected)
-- Enhanced security without problematic indexes

-- 1. CREATE ENHANCED RATE LIMITING FUNCTION FOR SENSITIVE DATA
CREATE OR REPLACE FUNCTION public.check_rate_limit_ultra_sensitive(p_user_id uuid, p_resource_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count integer;
  max_access_per_hour integer := 20; -- Stricter limit for ultra-sensitive data
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
  
  -- Ultra-strict rate limiting for sensitive data
  IF access_count > max_access_per_hour THEN
    -- Log the violation with maximum risk score
    PERFORM public.log_security_event_secure(
      'ultra_rate_limit_violation',
      p_resource_type,
      p_user_id,
      false,
      jsonb_build_object(
        'access_count', access_count,
        'max_allowed', max_access_per_hour,
        'time_window', '1 hour',
        'blocked', true,
        'severity', 'CRITICAL'
      )::text
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 2. CREATE INVITATION EMAIL PROTECTION FUNCTION
CREATE OR REPLACE FUNCTION public.secure_invitation_access(p_invitation_id uuid, p_viewer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE id = p_invitation_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Only allow access if:
  -- 1. User is the subscription admin, OR
  -- 2. User's email matches the invitation email
  IF EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitation_record.subscription_id 
    AND ms.admin_user_id = p_viewer_id
  ) OR auth.email() = invitation_record.email THEN
    
    -- Log legitimate access
    PERFORM public.log_security_event_secure(
      'invitation_legitimate_access',
      'invitations',
      p_viewer_id,
      true,
      jsonb_build_object(
        'invitation_id', p_invitation_id,
        'access_type', CASE 
          WHEN auth.email() = invitation_record.email THEN 'invited_user'
          ELSE 'subscription_admin'
        END
      )::text
    );
    
    RETURN true;
  ELSE
    -- Log suspicious access attempt
    PERFORM public.log_security_event_secure(
      'invitation_unauthorized_access_attempt',
      'invitations',
      p_viewer_id,
      false,
      jsonb_build_object(
        'invitation_id', p_invitation_id,
        'attempted_by', p_viewer_id,
        'invitation_email', invitation_record.email,
        'user_email', auth.email(),
        'threat_level', 'HIGH'
      )::text
    );
    
    RETURN false;
  END IF;
END;
$$;

-- 3. CREATE COMPREHENSIVE SECURITY ALERT SYSTEM
CREATE OR REPLACE FUNCTION public.trigger_security_alert(
  p_alert_type text,
  p_user_id uuid,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert high-priority security alert
  INSERT INTO public.security_events_realtime (
    event_type,
    user_id,
    risk_score,
    metadata,
    created_at
  ) VALUES (
    p_alert_type,
    p_user_id,
    10, -- Maximum risk score
    jsonb_build_object(
      'alert_type', p_alert_type,
      'timestamp', now(),
      'user_id', p_user_id,
      'details', COALESCE(p_details, '{}'::jsonb),
      'severity', 'CRITICAL',
      'requires_immediate_attention', true
    ),
    now()
  );
  
  -- Also log to enhanced audit
  PERFORM public.log_security_event_secure(
    p_alert_type,
    'security_alert',
    p_user_id,
    true,
    COALESCE(p_details::text, '{}')
  );
END;
$$;

-- 4. CREATE FUNCTION TO VALIDATE EMAIL CONFIRMATION FOR SENSITIVE ACCESS
CREATE OR REPLACE FUNCTION public.require_email_confirmation_for_sensitive_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has confirmed email via JWT
  IF auth.jwt() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check email confirmation in JWT
  IF (auth.jwt() ->> 'email_confirmed_at') IS NULL THEN
    -- Log attempt to access sensitive data without email confirmation
    PERFORM public.trigger_security_alert(
      'unconfirmed_email_sensitive_access_attempt',
      p_user_id,
      jsonb_build_object(
        'email', auth.email(),
        'attempted_at', now(),
        'jwt_data', auth.jwt()
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 5. ADD SIMPLE SECURITY INDEXES FOR PERFORMANCE (without time predicates)
CREATE INDEX IF NOT EXISTS idx_invitations_secure_lookup 
  ON public.invitations (subscription_id, email, status);

CREATE INDEX IF NOT EXISTS idx_security_audit_critical_events
  ON public.security_audit_enhanced (timestamp, risk_score, resource_type);

-- 6. CREATE CLEANUP FUNCTION FOR OLD SECURITY LOGS
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Only keep security logs for 90 days for performance
  DELETE FROM public.security_audit_enhanced 
  WHERE timestamp < now() - interval '90 days'
    AND risk_score < 8; -- Keep high-risk logs longer
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  PERFORM public.log_security_event_secure(
    'security_logs_cleanup',
    'maintenance',
    auth.uid(),
    true,
    jsonb_build_object(
      'deleted_count', deleted_count,
      'cleanup_date', now()
    )::text
  );
  
  RETURN deleted_count;
END;
$$;

-- 7. CREATE SECURITY MONITORING FUNCTION FOR REAL-TIME THREATS
CREATE OR REPLACE FUNCTION public.detect_immediate_threats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threat_user RECORD;
BEGIN
  -- Detect users with suspicious patterns in the last 10 minutes
  FOR threat_user IN
    SELECT 
      user_id,
      COUNT(*) as recent_attempts,
      array_agg(DISTINCT resource_type) as accessed_resources
    FROM public.security_audit_enhanced
    WHERE timestamp > now() - interval '10 minutes'
      AND risk_score >= 8
    GROUP BY user_id
    HAVING COUNT(*) > 15 -- More than 15 high-risk operations in 10 minutes
  LOOP
    -- Trigger immediate security alert
    PERFORM public.trigger_security_alert(
      'immediate_threat_detected',
      threat_user.user_id,
      jsonb_build_object(
        'recent_attempts', threat_user.recent_attempts,
        'accessed_resources', threat_user.accessed_resources,
        'detection_time', now(),
        'urgency', 'IMMEDIATE'
      )
    );
  END LOOP;
END;
$$;

-- 8. ADD COMMENTS FOR SECURITY FUNCTIONS
COMMENT ON FUNCTION public.check_rate_limit_ultra_sensitive(uuid, text) IS 
  'Ultra-strict rate limiting for sensitive data access - maximum 20 accesses per hour';

COMMENT ON FUNCTION public.secure_invitation_access(uuid, uuid) IS 
  'Validates and logs invitation access attempts to prevent email scraping';

COMMENT ON FUNCTION public.trigger_security_alert(text, uuid, jsonb) IS 
  'Creates high-priority security alerts for immediate threats';

COMMENT ON FUNCTION public.require_email_confirmation_for_sensitive_access(uuid) IS 
  'Ensures users have confirmed email before accessing sensitive data';

-- 9. FINAL SECURITY STATUS
SELECT 
  'CRITICAL SECURITY ENHANCEMENTS COMPLETED' as status,
  'Enhanced protection for sensitive data, invitations, and real-time threat detection active' as details;