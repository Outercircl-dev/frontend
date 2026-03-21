-- Fix remaining security issues: RLS policies that still allow public access
-- Corrected version without invalid trigger syntax

-- Fix invitations table - make it truly private
DROP POLICY IF EXISTS "invitations_enhanced_admin_access" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_access_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_select_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_no_public_access" ON public.invitations;

-- Create comprehensive RLS policies for invitations
CREATE POLICY "invitations_admin_only_all" 
ON public.invitations 
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
  AND expires_at > now()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- Update profiles_sensitive policies to be more restrictive
DROP POLICY IF EXISTS "profiles_sensitive_balanced_select" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "profiles_sensitive_balanced_update" ON public.profiles_sensitive;

-- Completely lock down profiles_sensitive - only allow through application logic
CREATE POLICY "profiles_sensitive_application_only_select" 
ON public.profiles_sensitive 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND can_access_sensitive_data(id)
  AND EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND u.email_confirmed_at IS NOT NULL
    AND u.created_at < now() - interval '24 hours'
  )
);

CREATE POLICY "profiles_sensitive_application_only_update" 
ON public.profiles_sensitive 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND can_access_sensitive_data(id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Update payment_metadata policies to be more restrictive  
DROP POLICY IF EXISTS "payment_metadata_balanced_select" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_balanced_update" ON public.payment_metadata;

-- Completely lock down payment_metadata - highest security
CREATE POLICY "payment_metadata_ultra_secure_select" 
ON public.payment_metadata 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND can_access_payment_data(user_id)
  AND EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND u.email_confirmed_at IS NOT NULL
    AND u.created_at < now() - interval '7 days'
    AND u.last_sign_in_at > now() - interval '6 hours'
  )
);

CREATE POLICY "payment_metadata_ultra_secure_update" 
ON public.payment_metadata 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND can_access_payment_data(user_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Add function to completely disable public schema access to sensitive tables
CREATE OR REPLACE FUNCTION public.revoke_public_access_to_sensitive_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Revoke all public access to sensitive tables
  REVOKE ALL ON public.profiles_sensitive FROM public, anon;
  REVOKE ALL ON public.payment_metadata FROM public, anon;
  REVOKE ALL ON public.invitations FROM public, anon;
  
  -- Grant only specific access through RLS to authenticated users
  GRANT SELECT, UPDATE, INSERT ON public.profiles_sensitive TO authenticated;
  GRANT SELECT, UPDATE, INSERT ON public.payment_metadata TO authenticated;
  GRANT SELECT, UPDATE, INSERT ON public.invitations TO authenticated;
  
  RAISE NOTICE 'Public access revoked from sensitive tables';
END;
$$;

-- Execute the function to lock down access
SELECT public.revoke_public_access_to_sensitive_tables();

-- Add comprehensive monitoring for sensitive table access (using proper trigger events)
CREATE OR REPLACE FUNCTION public.monitor_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all access to sensitive tables with high detail
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
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    TG_TABLE_NAME,
    9, -- Maximum security level
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'session_info', jsonb_build_object(
        'user_id', auth.uid(),
        'role', current_user,
        'authenticated', auth.uid() IS NOT NULL
      )
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply monitoring triggers to sensitive tables (using valid trigger events)
DROP TRIGGER IF EXISTS profiles_sensitive_access_monitor ON public.profiles_sensitive;
CREATE TRIGGER profiles_sensitive_access_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();

DROP TRIGGER IF EXISTS payment_metadata_access_monitor ON public.payment_metadata;  
CREATE TRIGGER payment_metadata_access_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();

DROP TRIGGER IF EXISTS invitations_access_monitor ON public.invitations;
CREATE TRIGGER invitations_access_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();

-- Create security verification function
CREATE OR REPLACE FUNCTION public.verify_security_implementation()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policies_count bigint,
  public_access_revoked boolean,
  monitoring_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    t.row_security::boolean as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.table_name) as policies_count,
    NOT has_table_privilege('public', 'public.' || t.table_name, 'SELECT') as public_access_revoked,
    EXISTS(
      SELECT 1 FROM pg_trigger tr 
      WHERE tr.tgrelid = ('public.' || t.table_name)::regclass
    ) as monitoring_enabled
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
  AND t.table_name IN ('profiles_sensitive', 'payment_metadata', 'invitations')
  ORDER BY t.table_name;
END;
$$;

-- Verify the security implementation
SELECT * FROM public.verify_security_implementation();