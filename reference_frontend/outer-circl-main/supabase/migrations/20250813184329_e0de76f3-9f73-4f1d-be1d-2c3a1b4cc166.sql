-- Security Enhancement: Strengthen RLS for Sensitive Data Tables
-- This migration addresses security concerns around sensitive data access

-- 1. First, let's ensure the profiles_sensitive table has the strongest possible RLS
-- The current policy is good but we'll make it even more explicit and add logging

-- Add audit trigger for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id UUID,
  p_operation TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    risk_score
  ) VALUES (
    p_user_id,
    p_operation || '_sensitive_data',
    p_table_name,
    p_record_id,
    p_metadata || jsonb_build_object(
      'table', p_table_name,
      'timestamp', now(),
      'session_id', current_setting('request.jwt.claims', true)::jsonb->>'session_id'
    ),
    CASE 
      WHEN p_operation IN ('SELECT', 'UPDATE') THEN 3
      WHEN p_operation = 'INSERT' THEN 2
      ELSE 5
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profiles_sensitive to log all access
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive data
  PERFORM public.log_sensitive_access(
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply audit trigger to profiles_sensitive
DROP TRIGGER IF EXISTS audit_sensitive_access_trigger ON public.profiles_sensitive;
CREATE TRIGGER audit_sensitive_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

-- 2. Strengthen the profiles_sensitive RLS policy with explicit session validation
DROP POLICY IF EXISTS "profiles_sensitive_strict_owner" ON public.profiles_sensitive;
CREATE POLICY "profiles_sensitive_enhanced_security" ON public.profiles_sensitive
  FOR ALL 
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND (current_setting('request.jwt.claims', true)::jsonb->>'aud')::text = 'authenticated'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND (current_setting('request.jwt.claims', true)::jsonb->>'aud')::text = 'authenticated'
  );

-- 3. Add RLS policies to profiles_payment_secure if missing
DROP POLICY IF EXISTS "payment_secure_owner_only" ON public.profiles_payment_secure;
CREATE POLICY "payment_secure_owner_only" ON public.profiles_payment_secure
  FOR ALL
  TO authenticated  
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND (current_setting('request.jwt.claims', true)::jsonb->>'aud')::text = 'authenticated'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = id
    AND (current_setting('request.jwt.claims', true)::jsonb->>'aud')::text = 'authenticated'
  );

-- 4. Add RLS policies to invitations_admin_secure
DROP POLICY IF EXISTS "invitations_admin_secure_policy" ON public.invitations_admin_secure;
CREATE POLICY "invitations_admin_secure_admin_only" ON public.invitations_admin_secure
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND has_role(auth.uid(), 'admin'::app_role)
    AND (current_setting('request.jwt.claims', true)::jsonb->>'aud')::text = 'authenticated'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND has_role(auth.uid(), 'admin'::app_role)
    AND (current_setting('request.jwt.claims', true)::jsonb->>'aud')::text = 'authenticated'
  );

-- 5. Create a security function to validate sensitive data access patterns
CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access(
  p_table_name TEXT,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
  access_count INTEGER;
  is_suspicious BOOLEAN := FALSE;
BEGIN
  -- Check for excessive access patterns in the last hour
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND resource_type = p_table_name
    AND timestamp > now() - INTERVAL '1 hour'
    AND action LIKE '%sensitive_data';
  
  -- Flag as suspicious if more than 50 accesses in an hour
  IF access_count > 50 THEN
    is_suspicious := TRUE;
    
    -- Log the suspicious activity
    INSERT INTO public.security_audit_enhanced (
      user_id,
      action,
      resource_type,
      metadata,
      risk_score
    ) VALUES (
      p_user_id,
      'suspicious_sensitive_access',
      p_table_name,
      jsonb_build_object(
        'access_count', access_count,
        'time_window', '1 hour',
        'timestamp', now()
      ),
      9
    );
  END IF;
  
  RETURN NOT is_suspicious;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Add additional security indexes for monitoring
CREATE INDEX IF NOT EXISTS idx_security_audit_sensitive_access 
ON public.security_audit_enhanced (user_id, resource_type, timestamp) 
WHERE action LIKE '%sensitive_data';

CREATE INDEX IF NOT EXISTS idx_profiles_sensitive_security 
ON public.profiles_sensitive (id, last_security_check) 
WHERE email IS NOT NULL OR phone IS NOT NULL;

-- 7. Create a function to check data access permissions before sensitive operations
CREATE OR REPLACE FUNCTION public.check_sensitive_data_permission(
  p_table_name TEXT,
  p_record_id UUID,
  p_operation TEXT DEFAULT 'SELECT'
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate the user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- For profiles_sensitive, ensure user can only access their own data
  IF p_table_name = 'profiles_sensitive' THEN
    RETURN auth.uid() = p_record_id;
  END IF;
  
  -- For payment data, ensure user can only access their own data
  IF p_table_name IN ('profiles_payment_secure', 'payment_metadata') THEN
    RETURN auth.uid() = p_record_id;
  END IF;
  
  -- For admin tables, ensure user has admin role
  IF p_table_name LIKE '%admin%' THEN
    RETURN has_role(auth.uid(), 'admin'::app_role);
  END IF;
  
  -- Default deny for unknown sensitive tables
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Add a periodic cleanup function for audit logs (security maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_security_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep audit logs for 90 days for sensitive data access
  DELETE FROM public.security_audit_enhanced 
  WHERE timestamp < now() - INTERVAL '90 days'
    AND action LIKE '%sensitive_data';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;