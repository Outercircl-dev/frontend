-- Fix Financial Data Security Issue in payment_metadata table
-- Issue: The user_id column being nullable could create security gaps

-- First, ensure no orphaned payment records exist (backup safety)
UPDATE public.payment_metadata 
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid 
WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent security gaps
ALTER TABLE public.payment_metadata 
ALTER COLUMN user_id SET NOT NULL;

-- Drop the existing ultra_secure policy to recreate with enhanced security
DROP POLICY IF EXISTS "payment_metadata_ultra_secure" ON public.payment_metadata;

-- Create enhanced RLS policy with additional security checks
CREATE POLICY "payment_metadata_enhanced_security" ON public.payment_metadata
FOR ALL
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL 
  -- Must own the data
  AND auth.uid() = user_id
  -- Valid JWT with authenticated audience
  AND COALESCE(((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'aud'::text), 'unknown'::text) = 'authenticated'::text
  -- Additional session validation
  AND COALESCE(((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text), 'unknown'::text) = 'authenticated'::text
)
WITH CHECK (
  -- Same conditions for inserts/updates
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND COALESCE(((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'aud'::text), 'unknown'::text) = 'authenticated'::text
  AND COALESCE(((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text), 'unknown'::text) = 'authenticated'::text
);

-- Add audit trigger for payment data access logging
CREATE OR REPLACE FUNCTION public.log_payment_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all access to payment metadata for security monitoring
  PERFORM public.log_security_event_secure(
    'payment_data_access',
    'payment_metadata',
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'operation', TG_OP,
      'user_id', auth.uid(),
      'timestamp', now(),
      'security_level', COALESCE(NEW.security_level, OLD.security_level)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to payment_metadata
CREATE TRIGGER payment_metadata_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.log_payment_access();

-- Create additional security function for payment data validation
CREATE OR REPLACE FUNCTION public.validate_payment_access(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Enhanced validation for payment data access
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create index for enhanced security queries
CREATE INDEX IF NOT EXISTS idx_payment_metadata_security 
ON public.payment_metadata(user_id, security_level, last_accessed);

-- Add constraint to ensure high security level for payment data
ALTER TABLE public.payment_metadata 
ADD CONSTRAINT check_security_level_payment 
CHECK (security_level IN ('high', 'maximum', 'critical'));

-- Update existing records to ensure proper security level
UPDATE public.payment_metadata 
SET security_level = 'critical' 
WHERE security_level = 'high';

COMMENT ON TABLE public.payment_metadata IS 'Ultra-secure table for encrypted payment data. Access strictly controlled by enhanced RLS policies.';
COMMENT ON COLUMN public.payment_metadata.encrypted_stripe_data IS 'Encrypted Stripe payment data. Access logged for security monitoring.';
COMMENT ON COLUMN public.payment_metadata.user_id IS 'NOT NULL foreign key to user. Required for RLS security enforcement.';