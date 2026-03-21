-- Phase 2: Enhanced RLS Policies - Strengthen security without breaking functionality

-- Update rate_limits table RLS to allow function access
DROP POLICY IF EXISTS "rate_limits_function_access_only" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_no_direct_access" ON public.rate_limits;

-- Create more nuanced rate_limits policies
CREATE POLICY "rate_limits_system_function_access" ON public.rate_limits
FOR ALL USING (
  -- Allow access from security functions and admins
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Allow system functions to access (they run as SECURITY DEFINER)
  current_setting('role') = 'supabase_admin'
);

-- Enhanced profiles_sensitive policies with additional validation layers
CREATE POLICY "profiles_sensitive_enhanced_access_control" ON public.profiles_sensitive
FOR SELECT USING (
  -- Original access control
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND 
  id IS NOT NULL AND 
  can_access_sensitive_data(id) AND
  -- Additional time-based validation
  EXTRACT(EPOCH FROM (now() - COALESCE(
    (SELECT session_not_after FROM auth.sessions 
     WHERE user_id = auth.uid() 
     ORDER BY created_at DESC LIMIT 1),
    now() - INTERVAL '1 hour'
  ))) < 86400 -- Session must be less than 24 hours old
);

-- Enhanced payment_metadata policies with multi-layer validation  
CREATE POLICY "payment_metadata_enhanced_financial_access" ON public.payment_metadata
FOR SELECT USING (
  -- Original access control
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND 
  user_id IS NOT NULL AND 
  can_access_sensitive_data(user_id) AND
  -- Additional financial data protection
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.account_status = 'active'
    AND p.created_at < now() - INTERVAL '24 hours' -- Account must be at least 24 hours old
  )
);

-- Enhanced invitations policies with email protection
CREATE POLICY "invitations_enhanced_admin_access" ON public.invitations
FOR SELECT USING (
  -- Original admin access
  auth.uid() IS NOT NULL AND 
  auth.uid() = invited_by AND 
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
    -- Additional verification: admin must have verified email
    AND EXISTS (
      SELECT 1 FROM auth.users u 
      WHERE u.id = auth.uid() 
      AND u.email_confirmed_at IS NOT NULL
      AND u.created_at < now() - INTERVAL '1 hour' -- Account age verification
    )
  )
);

-- Audit log protection with append-only security
CREATE POLICY "security_audit_enhanced_append_only" ON public.security_audit_enhanced
FOR INSERT WITH CHECK (
  -- Only allow system functions to insert
  current_setting('role') = 'supabase_admin' OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Prevent tampering with audit logs
CREATE POLICY "security_audit_enhanced_no_modification" ON public.security_audit_enhanced
FOR UPDATE USING (false);

CREATE POLICY "security_audit_enhanced_no_deletion" ON public.security_audit_enhanced  
FOR DELETE USING (false);

-- Add cleanup function for old security data with retention limits
CREATE OR REPLACE FUNCTION public.cleanup_security_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Only allow admins to run cleanup
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required for audit log cleanup';
  END IF;
  
  -- Delete audit logs older than 90 days (retain 90 days for compliance)
  DELETE FROM public.security_audit_enhanced
  WHERE timestamp < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete old rate limit entries older than 7 days
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '7 days';
  
  -- Log the cleanup operation
  INSERT INTO public.security_audit_enhanced (
    user_id, action, resource_type, risk_score, metadata, timestamp
  ) VALUES (
    auth.uid(), 'audit_cleanup', 'security_audit_enhanced', 3,
    jsonb_build_object('deleted_records', deleted_count, 'cleanup_date', now()),
    now()
  );
  
  RETURN deleted_count;
END;
$$;