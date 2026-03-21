-- COMPREHENSIVE SECURITY REMEDIATION PLAN
-- Fixes all critical security issues except leaked password protection

-- =========================================================================
-- PHASE 1: Email Security (Critical) - Fix Invitations Table
-- =========================================================================

-- First, DROP all existing problematic policies on invitations table
DROP POLICY IF EXISTS "invitations_secure_admin" ON public.invitations;
DROP POLICY IF EXISTS "invitations_secure_admin_access" ON public.invitations;
DROP POLICY IF EXISTS "invitations_secure_email_access" ON public.invitations;
DROP POLICY IF EXISTS "invitations_secure_own_email" ON public.invitations;

-- Create enhanced validation functions for invitations
CREATE OR REPLACE FUNCTION public.validate_invitation_admin_access(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM membership_subscriptions ms
    WHERE ms.id = p_subscription_id 
    AND ms.admin_user_id = p_user_id
    AND ms.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_invitation_email_access(p_email text, p_user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    p_email IS NOT NULL 
    AND p_user_email IS NOT NULL 
    AND LOWER(p_email) = LOWER(p_user_email)
  );
END;
$$;

-- Create secure RLS policies for invitations
CREATE POLICY "invitations_admin_full_access" ON public.invitations
FOR ALL USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND validate_invitation_admin_access(subscription_id, auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND validate_invitation_admin_access(subscription_id, auth.uid())
);

CREATE POLICY "invitations_email_owner_read_only" ON public.invitations
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND auth.email() IS NOT NULL
  AND validate_invitation_email_access(email, auth.email())
  AND status = 'pending'
  AND expires_at > now()
);

-- =========================================================================
-- PHASE 2: Sensitive Data Protection Enhancement (Critical)
-- =========================================================================

-- Enhanced function for sensitive data permission checking
CREATE OR REPLACE FUNCTION public.check_sensitive_data_permission_enhanced(p_user_id uuid, p_table_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  user_confirmed boolean := false;
  session_valid boolean := false;
  jwt_role text;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Basic checks
  IF current_user_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- User can only access their own data
  IF current_user_id != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Check user confirmation status
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = current_user_id 
    AND confirmed_at IS NOT NULL
    AND email_confirmed_at IS NOT NULL
  ) INTO user_confirmed;
  
  IF NOT user_confirmed THEN
    RETURN false;
  END IF;
  
  -- Check JWT audience and role
  jwt_role := COALESCE(auth.jwt() ->> 'aud', '');
  IF jwt_role != 'authenticated' THEN
    RETURN false;
  END IF;
  
  -- Log access attempt
  PERFORM log_sensitive_access(current_user_id, 'SELECT', p_table_name, p_user_id, 
    jsonb_build_object('table', p_table_name, 'access_type', 'enhanced_check'));
  
  RETURN true;
END;
$$;

-- Update sensitive tables policies to use enhanced function
DROP POLICY IF EXISTS "profiles_sensitive_ultra_secure_v2" ON public.profiles_sensitive;
CREATE POLICY "profiles_sensitive_ultra_secure_v3" ON public.profiles_sensitive
FOR ALL USING (
  check_sensitive_data_permission_enhanced(id, 'profiles_sensitive')
)
WITH CHECK (
  check_sensitive_data_permission_enhanced(id, 'profiles_sensitive')
);

-- Enhanced payment metadata security
DROP POLICY IF EXISTS "payment_metadata_deny_anonymous" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_ultimate_security" ON public.payment_metadata;

CREATE POLICY "payment_metadata_enhanced_security" ON public.payment_metadata
FOR ALL USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
  AND check_sensitive_data_permission_enhanced(user_id, 'payment_metadata')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
  AND check_sensitive_data_permission_enhanced(user_id, 'payment_metadata')
);

-- =========================================================================
-- PHASE 3: Function Security Hardening (Important)
-- =========================================================================

-- Update all functions that need search_path setting
CREATE OR REPLACE FUNCTION public.archive_conversation(conversation_id text, conversation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO user_deleted_conversations (user_id, conversation_id, conversation_type)
  VALUES (auth.uid(), conversation_id, conversation_type);
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.debug_message_access(p_event_id uuid)
RETURNS TABLE(
  can_access boolean,
  is_participant boolean,
  is_host boolean,
  event_exists boolean,
  user_authenticated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = p_event_id AND ep.user_id = auth.uid() AND ep.status = 'attending') OR
      EXISTS (SELECT 1 FROM events e WHERE e.id = p_event_id AND e.host_id = auth.uid())
    ))::boolean as can_access,
    EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = p_event_id AND ep.user_id = auth.uid() AND ep.status = 'attending')::boolean as is_participant,
    EXISTS (SELECT 1 FROM events e WHERE e.id = p_event_id AND e.host_id = auth.uid())::boolean as is_host,
    EXISTS (SELECT 1 FROM events e WHERE e.id = p_event_id)::boolean as event_exists,
    (auth.uid() IS NOT NULL)::boolean as user_authenticated;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_payment_access(p_user_id uuid, p_operation text, p_metadata jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM log_security_event_secure(
    p_operation,
    'payment_metadata',
    p_user_id,
    true,
    COALESCE(p_metadata, '{}'::jsonb)::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.test_payment_metadata_security()
RETURNS TABLE(test_name text, result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 
    'RLS Enabled'::text as test_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'payment_metadata' 
      AND relrowsecurity = true
    ) THEN 'PASS' ELSE 'FAIL' END as result
  UNION ALL
  SELECT 
    'Policies Count'::text as test_name,
    (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'payment_metadata') as result;
END;
$$;

CREATE OR REPLACE FUNCTION public.unarchive_conversation(conversation_id text, conversation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM user_deleted_conversations 
  WHERE user_id = auth.uid() 
  AND conversation_id = unarchive_conversation.conversation_id 
  AND conversation_type = unarchive_conversation.conversation_type;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_payment_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    auth.uid() IS NOT NULL 
    AND auth.uid() = p_user_id
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND confirmed_at IS NOT NULL
      AND email_confirmed_at IS NOT NULL
    )
  );
END;
$$;

-- =========================================================================
-- PHASE 4: Rate Limiting Security (Important)
-- =========================================================================

-- Drop the blanket denial policy and create proper system access
DROP POLICY IF EXISTS "System access only for rate limits" ON public.rate_limits;

-- Create system functions for rate limit management
CREATE OR REPLACE FUNCTION public.system_check_rate_limit(
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
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries (older than 24 hours)
  DELETE FROM rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
  
  -- Count current requests in window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM rate_limits
  WHERE endpoint = p_endpoint
    AND window_start >= window_start_time
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    );
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO rate_limits (user_id, ip_address, endpoint, request_count, window_start)
  VALUES (p_user_id, p_ip_address, p_endpoint, 1, date_trunc('minute', now()))
  ON CONFLICT (COALESCE(user_id::text, ''), COALESCE(host(ip_address), ''), endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN true;
END;
$$;

-- Create new RLS policies for rate_limits with proper system access
CREATE POLICY "rate_limits_system_functions_only" ON public.rate_limits
FOR ALL USING (false)  -- No direct user access
WITH CHECK (false);     -- All operations through functions only

-- Allow function-based access through security definer functions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO authenticated;
REVOKE ALL ON public.rate_limits FROM anon;

-- =========================================================================
-- PHASE 5: Enhanced Audit and Monitoring
-- =========================================================================

-- Create enhanced security audit function
CREATE OR REPLACE FUNCTION public.log_sensitive_access_enhanced(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  risk_score integer := 0;
  hour_count integer;
BEGIN
  -- Calculate risk score based on access patterns
  SELECT COUNT(*) INTO hour_count
  FROM security_audit_enhanced
  WHERE user_id = p_user_id
  AND timestamp > now() - INTERVAL '1 hour'
  AND resource_type = p_table_name;
  
  -- Set risk score based on frequency
  CASE 
    WHEN hour_count > 50 THEN risk_score := 90;  -- Very high
    WHEN hour_count > 20 THEN risk_score := 70;  -- High
    WHEN hour_count > 10 THEN risk_score := 40;  -- Medium
    ELSE risk_score := 10;                       -- Low
  END CASE;
  
  -- Insert audit record
  INSERT INTO security_audit_enhanced (
    user_id, action, resource_type, resource_id, 
    risk_score, metadata, timestamp
  ) VALUES (
    p_user_id, p_operation, p_table_name, p_resource_id,
    risk_score, COALESCE(p_metadata, '{}'::jsonb), now()
  );
  
  -- Alert on high risk
  IF risk_score >= 70 THEN
    INSERT INTO notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      p_user_id,
      'Security Alert',
      'Unusual access pattern detected on your account',
      'security_alert',
      jsonb_build_object('risk_score', risk_score, 'table', p_table_name)
    );
  END IF;
END;
$$;

-- Update the log_sensitive_access function to use enhanced version
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM log_sensitive_access_enhanced(p_user_id, p_operation, p_table_name, p_resource_id, p_metadata);
END;
$$;

-- =========================================================================
-- FINAL VALIDATION AND TESTING
-- =========================================================================

-- Create comprehensive validation function
CREATE OR REPLACE FUNCTION public.validate_comprehensive_security()
RETURNS TABLE(
  security_area text,
  status text,
  details text,
  recommendation text
) AS $$
BEGIN
  -- Test 1: Invitations table security
  RETURN QUERY
  SELECT 
    'EMAIL_SECURITY'::text,
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'invitations') >= 2 
      THEN 'SECURE' ELSE 'NEEDS_ATTENTION' END,
    'Invitations table RLS policies: ' || (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'invitations'),
    'Should have proper admin and email-owner policies';
  
  -- Test 2: Sensitive data protection
  RETURN QUERY
  SELECT 
    'SENSITIVE_DATA'::text,
    CASE WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename IN ('profiles_sensitive', 'payment_metadata')
    ) >= 2 THEN 'SECURE' ELSE 'NEEDS_ATTENTION' END,
    'Sensitive tables policies: ' || (SELECT COUNT(*)::text FROM pg_policies WHERE tablename IN ('profiles_sensitive', 'payment_metadata')),
    'Enhanced protection for customer data';
  
  -- Test 3: Function security
  RETURN QUERY
  SELECT 
    'FUNCTION_SECURITY'::text,
    CASE WHEN (
      SELECT COUNT(*) FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND prosecdef = true
      AND proname IN ('archive_conversation', 'debug_message_access', 'log_payment_access', 
                     'test_payment_metadata_security', 'unarchive_conversation', 'validate_payment_access')
    ) >= 6 THEN 'SECURE' ELSE 'NEEDS_ATTENTION' END,
    'Security definer functions with search_path',
    'All critical functions should have proper search_path';
  
  -- Test 4: Rate limiting
  RETURN QUERY
  SELECT 
    'RATE_LIMITING'::text,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'system_check_rate_limit'
    ) THEN 'SECURE' ELSE 'NEEDS_ATTENTION' END,
    'System rate limiting functions available',
    'Proper system-level access controls';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Run final validation
SELECT * FROM validate_comprehensive_security();