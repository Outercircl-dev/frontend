-- Check and completely fix payment_metadata RLS policies
-- First, check what policies currently exist
\d+ public.payment_metadata

-- Drop any existing policies that might be problematic
DROP POLICY IF EXISTS "payment_metadata_enhanced_security" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_ultra_secure" ON public.payment_metadata;

-- Ensure RLS is enabled (should already be, but being explicit)
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
  -- Ensure user exists in auth table
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

-- Create backup policy to ensure no leaks
CREATE POLICY "payment_metadata_deny_anonymous" 
ON public.payment_metadata
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Verify the policies are working
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'payment_metadata';

-- Additional security: revoke all public access
REVOKE ALL ON public.payment_metadata FROM public;
REVOKE ALL ON public.payment_metadata FROM anon;

-- Grant only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_metadata TO authenticated;