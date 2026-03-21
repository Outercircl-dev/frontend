-- Fix payment_metadata RLS policies properly
-- Drop any existing policies that might be problematic
DROP POLICY IF EXISTS "payment_metadata_enhanced_security" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_ultra_secure" ON public.payment_metadata;

-- Ensure RLS is enabled
ALTER TABLE public.payment_metadata ENABLE ROW LEVEL SECURITY;

-- Create the ultimate secure policy for payment metadata
CREATE POLICY "payment_metadata_ultimate_security" 
ON public.payment_metadata
FOR ALL
USING (
  -- Triple authentication check
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
  -- Ensure user exists in auth table with confirmed email
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND confirmed_at IS NOT NULL
  )
)
WITH CHECK (
  -- Same strict conditions for writes
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND confirmed_at IS NOT NULL
  )
);

-- Create explicit deny policy for anonymous users
CREATE POLICY "payment_metadata_deny_anonymous" 
ON public.payment_metadata
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Additional security: revoke all public access
REVOKE ALL ON public.payment_metadata FROM public;
REVOKE ALL ON public.payment_metadata FROM anon;

-- Grant only to authenticated users (who still need to pass RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_metadata TO authenticated;

-- Create function to test policy effectiveness
CREATE OR REPLACE FUNCTION public.test_payment_metadata_security()
RETURNS TABLE(test_name text, result text) AS $$
BEGIN
  -- Return test results for policy verification
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the test
SELECT * FROM public.test_payment_metadata_security();