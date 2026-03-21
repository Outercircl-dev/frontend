-- Phase 2: Enhanced RLS Policies - Fixed version without non-existent columns

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

-- Enhanced invitations policies with email protection
DROP POLICY IF EXISTS "invitations_enhanced_admin_access" ON public.invitations;
CREATE POLICY "invitations_enhanced_admin_access" ON public.invitations
FOR SELECT USING (
  -- Original admin access with additional verification
  auth.uid() IS NOT NULL AND 
  auth.uid() = invited_by AND 
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  ) AND
  -- Additional verification: ensure invitation is not expired  
  expires_at > now()
);

-- Audit log protection with append-only security
CREATE POLICY "security_audit_enhanced_append_only" ON public.security_audit_enhanced
FOR INSERT WITH CHECK (
  -- Only allow system functions and admins to insert
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

-- Create enhanced validation function for sensitive data access
CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access_enhanced(
  p_user_id UUID,
  p_resource_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_active BOOLEAN := false;
  account_age INTERVAL;
BEGIN
  -- Basic authentication check
  IF p_user_id IS NULL OR auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Check profile status and account age
  SELECT 
    (account_status = 'active'),
    (now() - created_at)
  INTO profile_active, account_age
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Enhanced validation for sensitive resources
  IF p_resource_type IN ('profiles_sensitive', 'payment_metadata') THEN
    -- Account must be active and at least 1 hour old
    IF NOT profile_active OR account_age < INTERVAL '1 hour' THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;