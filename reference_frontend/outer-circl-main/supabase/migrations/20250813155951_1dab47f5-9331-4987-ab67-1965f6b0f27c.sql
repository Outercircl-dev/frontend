-- CRITICAL SECURITY FIX: Secure Profile Data Access (Fixed)
-- Protect sensitive PII including email, phone, and Stripe customer data

-- 1. Drop existing policy to recreate with bulletproof security
DROP POLICY IF EXISTS "profiles_own_data_only" ON public.profiles;

-- 2. Create strict, granular RLS policies for each operation

-- SELECT: Users can ONLY view their own profile data
CREATE POLICY "profiles_select_own_only" ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL
  AND id IS NOT NULL
);

-- INSERT: Users can ONLY create their own profile
CREATE POLICY "profiles_insert_own_only" ON public.profiles  
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL
  AND id IS NOT NULL
);

-- UPDATE: Users can ONLY update their own profile data
CREATE POLICY "profiles_update_own_only" ON public.profiles
FOR UPDATE  
TO authenticated
USING (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL
  AND id IS NOT NULL
)
WITH CHECK (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL
  AND id IS NOT NULL
);

-- DELETE: Completely prevent profile deletion (use deactivation instead)
CREATE POLICY "profiles_no_delete_allowed" ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- 3. Create security validation function
CREATE OR REPLACE FUNCTION public.validate_profile_access(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() = profile_id 
  AND auth.uid() IS NOT NULL 
  AND profile_id IS NOT NULL;
$$;

-- 4. Create security enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure only authenticated users can access profiles
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for profile access';
  END IF;
  
  -- Prevent ID tampering on updates
  IF TG_OP = 'UPDATE' AND NEW.id != OLD.id THEN
    RAISE EXCEPTION 'Profile ID cannot be changed';
  END IF;
  
  -- Ensure users can only modify their own profile
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Users can only modify their own profile data';
  END IF;
  
  -- Log sensitive data access for security monitoring
  PERFORM public.log_security_event(
    'profile_data_access',
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'accessed_user_id', NEW.id,
      'operation', TG_OP,
      'timestamp', now(),
      'has_email', CASE WHEN NEW.email IS NOT NULL THEN true ELSE false END,
      'has_phone', CASE WHEN NEW.phone IS NOT NULL THEN true ELSE false END,
      'has_stripe_id', CASE WHEN NEW.stripe_customer_id IS NOT NULL THEN true ELSE false END
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Create security enforcement trigger
DROP TRIGGER IF EXISTS enforce_profile_security_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_security_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_security();

-- 5. Add critical security documentation
COMMENT ON TABLE public.profiles IS 'CRITICAL PII TABLE: Contains sensitive personal data including email, phone, Stripe customer ID. Access strictly limited to profile owners only via RLS.';
COMMENT ON COLUMN public.profiles.email IS 'SENSITIVE: User email address - protected by RLS';
COMMENT ON COLUMN public.profiles.phone IS 'SENSITIVE: User phone number - protected by RLS';  
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'SENSITIVE: Stripe customer ID - protected by RLS';

-- 6. Create emergency access logging function
CREATE OR REPLACE FUNCTION public.log_emergency_profile_access(accessed_profile_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log any emergency access to profile data
  PERFORM public.log_security_event(
    'emergency_profile_access',
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'accessed_profile_id', accessed_profile_id,
      'emergency_reason', reason,
      'timestamp', now(),
      'admin_user', auth.uid()
    )::text
  );
END;
$$;