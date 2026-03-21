-- Fix Critical Security Issues: Corrected RLS Policies for Actual Schema

-- 1. Fix invitations table - use correct column names
DROP POLICY IF EXISTS "invitations_creator_access_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_create_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_select_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_update_only" ON public.invitations;

-- Create enhanced policies for invitations with proper column names
CREATE POLICY "Enhanced invitations security - select" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = invited_by AND
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Enhanced invitations security - insert" 
ON public.invitations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = invited_by AND
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Enhanced invitations security - update" 
ON public.invitations 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = invited_by AND
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = invited_by AND
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 2. Ensure security audit tables are fully locked down
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "security_audit_admin_only" ON public.security_audit_enhanced;

CREATE POLICY "Security audit log - admin only" 
ON public.security_audit_log 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Security audit enhanced - admin only" 
ON public.security_audit_enhanced 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 3. Fix rate limiting tables - completely locked down
DROP POLICY IF EXISTS "rate_limits_function_access_only" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_no_direct_access" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_admin_only" ON public.sensitive_access_rate_limits;

-- No public access to rate limit tables at all
CREATE POLICY "Rate limits - no public access" 
ON public.rate_limits 
FOR ALL 
USING (false)
WITH CHECK (false);

CREATE POLICY "Sensitive rate limits - admin only" 
ON public.sensitive_access_rate_limits 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 4. Update function search paths for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create secure function for user role checking
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 5. Add comprehensive audit logging trigger for sensitive data
CREATE OR REPLACE FUNCTION public.log_sensitive_access_simple(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_record_id uuid
) RETURNS void AS $$
BEGIN
  -- Log to security audit enhanced table
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
      WHEN p_table_name = 'invitations' THEN 7
      ELSE 3
    END,
    jsonb_build_object(
      'operation', p_operation,
      'table', p_table_name,
      'timestamp', now()
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to prevent breaking operations
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Add triggers for audit logging
DROP TRIGGER IF EXISTS log_invitations_access ON public.invitations;
CREATE TRIGGER log_invitations_access
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_data_access();

-- Add comments for security documentation
COMMENT ON POLICY "Enhanced invitations security - select" ON public.invitations IS 
'Security: Only invitation creators (subscription admins) can view invitations';

COMMENT ON POLICY "Security audit log - admin only" ON public.security_audit_log IS 
'Security: Audit logs restricted to admin users only - prevents information leakage';

COMMENT ON POLICY "Rate limits - no public access" ON public.rate_limits IS 
'Security: Rate limit data completely hidden from public access';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';