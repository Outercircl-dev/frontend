-- Fix permission denied errors for sensitive tables by adding system access control
-- while maintaining strict security for user data

-- Grant SELECT permissions to supabase_read_only_user on sensitive tables
-- but RLS will still protect the actual data
GRANT SELECT ON public.profiles_sensitive TO supabase_read_only_user;
GRANT SELECT ON public.payment_metadata TO supabase_read_only_user;

-- Create a system user identifier function to distinguish system queries
CREATE OR REPLACE FUNCTION public.is_system_query()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT current_user IN ('supabase_read_only_user', 'supabase_admin', 'postgres');
$$;

-- Update profiles_sensitive RLS policies to allow system queries for monitoring
-- while maintaining strict user access controls
DROP POLICY IF EXISTS "profiles_sensitive_system_monitoring" ON public.profiles_sensitive;
CREATE POLICY "profiles_sensitive_system_monitoring" 
ON public.profiles_sensitive 
FOR SELECT 
TO supabase_read_only_user
USING (
  -- Allow system queries to see table structure but no actual data
  false
);

-- Update payment_metadata RLS policies to allow system queries for monitoring
DROP POLICY IF EXISTS "payment_metadata_system_monitoring" ON public.payment_metadata;
CREATE POLICY "payment_metadata_system_monitoring" 
ON public.payment_metadata 
FOR SELECT 
TO supabase_read_only_user
USING (
  -- Allow system queries to see table structure but no actual data
  false  
);

-- Log this security fix
INSERT INTO public.security_audit_enhanced (
  user_id,
  resource_id,
  action,
  resource_type,
  risk_score,
  metadata,
  timestamp
) VALUES (
  NULL,
  gen_random_uuid(),
  'system_access_permissions_fixed',
  'sensitive_tables',
  2,
  jsonb_build_object(
    'description', 'Fixed permission denied errors for system monitoring while maintaining data security',
    'tables_affected', ARRAY['profiles_sensitive', 'payment_metadata'],
    'security_level', 'maintained'
  ),
  now()
);