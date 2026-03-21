-- PHASE 4: Move Extension and Complete Security Fixes
-- Move pg_net extension from public to extensions schema

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Check and move pg_net extension if it exists in public
DO $$
BEGIN
  -- Check if pg_net extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e 
    JOIN pg_namespace n ON e.extnamespace = n.oid 
    WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  ) THEN
    -- Drop and recreate in extensions schema
    DROP EXTENSION pg_net CASCADE;
    CREATE EXTENSION pg_net SCHEMA extensions;
  ELSE
    -- Create in extensions schema if doesn't exist anywhere
    CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
  END IF;
END
$$;

-- PHASE 5: Enhanced Security Monitoring and Validation

-- Create comprehensive security test function
CREATE OR REPLACE FUNCTION public.comprehensive_security_test()
RETURNS TABLE(
  test_category text,
  test_name text,
  status text,
  details text
) AS $$
BEGIN
  -- Test RLS on sensitive tables
  RETURN QUERY
  SELECT 
    'RLS_POLICIES'::text,
    'payment_metadata_rls'::text,
    CASE WHEN (
      SELECT relrowsecurity FROM pg_class WHERE relname = 'payment_metadata'
    ) THEN 'PASS' ELSE 'FAIL' END,
    'Payment metadata table RLS status';
    
  RETURN QUERY
  SELECT 
    'RLS_POLICIES'::text,
    'profiles_sensitive_rls'::text,
    CASE WHEN (
      SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles_sensitive'
    ) THEN 'PASS' ELSE 'FAIL' END,
    'Profiles sensitive table RLS status';
  
  -- Test policy count
  RETURN QUERY
  SELECT 
    'POLICY_COUNT'::text,
    'payment_metadata_policies'::text,
    (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'payment_metadata'),
    'Number of RLS policies on payment_metadata';
  
  -- Test extension location
  RETURN QUERY
  SELECT 
    'EXTENSION_SECURITY'::text,
    'pg_net_location'::text,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_extension e 
      JOIN pg_namespace n ON e.extnamespace = n.oid 
      WHERE e.extname = 'pg_net' AND n.nspname = 'extensions'
    ) THEN 'PASS' ELSE 'FAIL' END,
    'pg_net extension location check';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create final security validation function
CREATE OR REPLACE FUNCTION public.validate_security_implementation()
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  sensitive_tables_secured boolean;
  critical_policies_count integer;
  extension_secure boolean;
BEGIN
  -- Check sensitive tables security
  SELECT COUNT(*) = 2 INTO sensitive_tables_secured
  FROM pg_class 
  WHERE relname IN ('payment_metadata', 'profiles_sensitive') 
  AND relrowsecurity = true;
  
  -- Count critical security policies
  SELECT COUNT(*) INTO critical_policies_count
  FROM pg_policies 
  WHERE tablename IN ('payment_metadata', 'profiles_sensitive');
  
  -- Check extension location
  SELECT EXISTS (
    SELECT 1 FROM pg_extension e 
    JOIN pg_namespace n ON e.extnamespace = n.oid 
    WHERE e.extname = 'pg_net' AND n.nspname = 'extensions'
  ) INTO extension_secure;
  
  -- Build result
  result := jsonb_build_object(
    'sensitive_tables_secured', sensitive_tables_secured,
    'critical_policies_count', critical_policies_count,
    'extension_secure', extension_secure,
    'overall_status', CASE 
      WHEN sensitive_tables_secured AND critical_policies_count >= 4 AND extension_secure 
      THEN 'SECURE' 
      ELSE 'NEEDS_ATTENTION' 
    END,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Run the validation
SELECT * FROM public.validate_security_implementation();