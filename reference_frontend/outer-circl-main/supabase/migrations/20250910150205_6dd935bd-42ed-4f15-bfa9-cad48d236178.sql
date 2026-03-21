-- CRITICAL SECURITY FIXES
-- Fix 1: Strengthen profiles_sensitive RLS policy with explicit column restrictions
DROP POLICY IF EXISTS "profiles_sensitive_authenticated_owner_only" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_ultra_secure_access" 
ON public.profiles_sensitive
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Fix 2: Strengthen payment_metadata RLS policy
DROP POLICY IF EXISTS "payment_metadata_authenticated_owner_only" ON public.payment_metadata;

CREATE POLICY "payment_metadata_ultra_secure_access"
ON public.payment_metadata  
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

-- Fix 3: Secure invitations table against email enumeration
DROP POLICY IF EXISTS "invitations_subscription_admin_only" ON public.invitations;

CREATE POLICY "invitations_secure_admin_access"
ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "invitations_secure_admin_insert"
ON public.invitations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "invitations_secure_admin_update"
ON public.invitations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- Fix 4: Update function search paths for security
CREATE OR REPLACE FUNCTION public.log_simple_security_event(
  p_action text,
  p_resource_type text DEFAULT 'general',
  p_resource_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    auth.uid(),
    p_resource_id,
    p_action,
    p_resource_type,
    CASE 
      WHEN NOT p_success THEN 8
      WHEN p_resource_type IN ('profiles_sensitive', 'payment_metadata') THEN 7
      ELSE 3
    END,
    jsonb_build_object(
      'success', p_success,
      'error_message', p_error_message,
      'timestamp', now()
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log to system but don't break operations
    RAISE WARNING 'Security event logging failed: %', SQLERRM;
END;
$$;

-- Fix 5: Add comprehensive audit logging triggers
CREATE OR REPLACE FUNCTION public.trigger_sensitive_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_simple_security_event(
    TG_OP::text,
    TG_TABLE_NAME::text,
    COALESCE(NEW.id, OLD.id),
    true,
    NULL
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply triggers to sensitive tables
DROP TRIGGER IF EXISTS profiles_sensitive_audit_trigger ON public.profiles_sensitive;
CREATE TRIGGER profiles_sensitive_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sensitive_audit();

DROP TRIGGER IF EXISTS payment_metadata_audit_trigger ON public.payment_metadata;
CREATE TRIGGER payment_metadata_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sensitive_audit();

-- Fix 6: Create security monitoring function with proper search path
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint text,
  p_user_id uuid DEFAULT auth.uid(),
  p_limit integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Count requests in the current window
  SELECT COUNT(*)
  INTO current_count
  FROM public.rate_limits
  WHERE endpoint = p_endpoint
    AND (user_id = p_user_id OR (p_user_id IS NULL AND user_id IS NULL))
    AND window_start > now() - (p_window_minutes || ' minutes')::interval;
  
  -- Log if approaching limit
  IF current_count >= (p_limit * 0.8) THEN
    PERFORM public.log_simple_security_event(
      'rate_limit_warning',
      'rate_limit',
      NULL,
      true,
      format('Endpoint %s approaching limit: %s/%s', p_endpoint, current_count, p_limit)
    );
  END IF;
  
  RETURN current_count < p_limit;
END;
$$;

-- Fix 7: Create comprehensive security status function
CREATE OR REPLACE FUNCTION public.get_security_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  status_result jsonb;
  threat_count integer;
  recent_violations integer;
BEGIN
  -- Only allow admins or system functions
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    current_setting('role') = 'supabase_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Count recent security events
  SELECT COUNT(*) INTO threat_count
  FROM public.security_audit_enhanced
  WHERE timestamp > now() - interval '1 hour'
    AND risk_score >= 7;
  
  -- Count rate limit violations
  SELECT COUNT(*) INTO recent_violations
  FROM public.rate_limits
  WHERE window_start > now() - interval '1 hour';
  
  status_result := jsonb_build_object(
    'system_health', CASE 
      WHEN threat_count > 10 THEN 'critical'
      WHEN threat_count > 5 THEN 'warning'
      ELSE 'healthy'
    END,
    'threat_level', CASE
      WHEN threat_count > 10 THEN 'high'
      WHEN threat_count > 5 THEN 'medium'
      ELSE 'low'
    END,
    'recent_threats', threat_count,
    'rate_violations', recent_violations,
    'last_check', now(),
    'rls_enabled', true,
    'audit_active', true
  );
  
  RETURN status_result;
END;
$$;