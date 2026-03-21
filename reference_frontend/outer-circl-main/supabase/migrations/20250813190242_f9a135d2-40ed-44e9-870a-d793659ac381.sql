-- PHASE 2: Enhanced Sensitive Data Security 
-- Drop existing function first to recreate with new signature
DROP FUNCTION IF EXISTS public.log_sensitive_access(uuid,text,text,uuid,jsonb);

-- Enhanced audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id uuid,
  p_action text,
  p_table_name text,
  p_resource_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    risk_score,
    timestamp
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_resource_id,
    p_metadata,
    CASE 
      WHEN p_table_name IN ('payment_metadata', 'profiles_sensitive') THEN 9
      ELSE 5
    END,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Enhanced validation for sensitive data access
CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Enhanced validation for sensitive data access
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to check sensitive data permission with audit logging
CREATE OR REPLACE FUNCTION public.check_sensitive_data_permission(p_user_id uuid, p_table_name text)
RETURNS boolean AS $$
DECLARE
  has_permission boolean;
BEGIN
  has_permission := validate_sensitive_data_access(p_user_id);
  
  -- Log access attempt
  PERFORM log_sensitive_access(
    auth.uid(),
    CASE WHEN has_permission THEN 'access_granted' ELSE 'access_denied' END,
    p_table_name,
    p_user_id,
    jsonb_build_object('permission_check', true, 'result', has_permission)
  );
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update profiles_sensitive RLS policy with enhanced security
DROP POLICY IF EXISTS "profiles_sensitive_ultra_secure" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_ultra_secure_v2" 
ON public.profiles_sensitive
FOR ALL
USING (
  check_sensitive_data_permission(id, 'profiles_sensitive')
)
WITH CHECK (
  check_sensitive_data_permission(id, 'profiles_sensitive')
);