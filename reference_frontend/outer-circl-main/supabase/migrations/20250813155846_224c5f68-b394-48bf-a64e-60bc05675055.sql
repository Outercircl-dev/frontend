-- CRITICAL SECURITY FIX: Strengthen Profile Data Protection
-- Protect sensitive PII including email, phone, and Stripe customer data

-- 1. Drop existing policy to recreate with stronger security
DROP POLICY IF EXISTS "profiles_own_data_only" ON public.profiles;

-- 2. Create separate, more granular RLS policies for different operations

-- SELECT: Users can only view their own profile data
CREATE POLICY "profiles_select_own_only" ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL
  AND id IS NOT NULL
);

-- INSERT: Users can only create their own profile (triggered by auth signup)
CREATE POLICY "profiles_insert_own_only" ON public.profiles  
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id 
  AND auth.uid() IS NOT NULL
  AND id IS NOT NULL
);

-- UPDATE: Users can only update their own profile data
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
  -- Prevent users from changing their own ID
  AND id = OLD.id
);

-- DELETE: Prevent profile deletion (use account deactivation instead)
CREATE POLICY "profiles_no_delete" ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- 3. Create security function to validate profile access
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

-- 4. Create trigger to log all profile data access for security monitoring
CREATE OR REPLACE FUNCTION public.log_profile_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log sensitive profile data access
  PERFORM public.log_security_event(
    'profile_data_access',
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'accessed_user_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now(),
      'sensitive_fields_accessed', jsonb_build_object(
        'email', CASE WHEN COALESCE(NEW.email, OLD.email) IS NOT NULL THEN true ELSE false END,
        'phone', CASE WHEN COALESCE(NEW.phone, OLD.phone) IS NOT NULL THEN true ELSE false END,
        'stripe_customer_id', CASE WHEN COALESCE(NEW.stripe_customer_id, OLD.stripe_customer_id) IS NOT NULL THEN true ELSE false END
      )
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for profile access logging
DROP TRIGGER IF EXISTS log_profile_data_access_trigger ON public.profiles;
CREATE TRIGGER log_profile_data_access_trigger
AFTER SELECT OR INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_data_access();

-- 5. Add rate limiting function for profile access
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(user_id uuid, operation text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_access_count INTEGER;
BEGIN
  -- Allow max 100 profile operations per hour per user
  SELECT COUNT(*) INTO recent_access_count
  FROM public.rate_limits
  WHERE user_id = check_profile_access_rate_limit.user_id
  AND endpoint = operation
  AND window_start > now() - INTERVAL '1 hour';
  
  RETURN recent_access_count < 100;
END;
$$;

-- 6. Add data masking function for sensitive fields
CREATE OR REPLACE FUNCTION public.mask_sensitive_profile_data(
  profile_data jsonb,
  requesting_user_id uuid,
  profile_owner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If not viewing own profile, mask sensitive data
  IF requesting_user_id != profile_owner_id THEN
    profile_data := jsonb_set(profile_data, '{email}', 'null'::jsonb);
    profile_data := jsonb_set(profile_data, '{phone}', 'null'::jsonb);
    profile_data := jsonb_set(profile_data, '{stripe_customer_id}', 'null'::jsonb);
  END IF;
  
  RETURN profile_data;
END;
$$;

-- 7. Add security documentation
COMMENT ON TABLE public.profiles IS 'CRITICAL: Contains sensitive PII including email, phone, Stripe customer ID. Access strictly limited to profile owners only.';
COMMENT ON COLUMN public.profiles.email IS 'SENSITIVE: User email address - owner access only';
COMMENT ON COLUMN public.profiles.phone IS 'SENSITIVE: User phone number - owner access only';  
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'SENSITIVE: Stripe customer ID - owner access only';

-- 8. Create additional security validation trigger
CREATE OR REPLACE FUNCTION public.validate_profile_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure authenticated user can only access their own data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for profile access';
  END IF;
  
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.id != auth.uid() THEN
      RAISE EXCEPTION 'Users can only modify their own profile data';
    END IF;
    
    -- Rate limit check
    IF NOT public.check_profile_access_rate_limit(auth.uid(), 'profile_' || LOWER(TG_OP)) THEN
      RAISE EXCEPTION 'Rate limit exceeded for profile operations';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create security validation trigger
DROP TRIGGER IF EXISTS validate_profile_security_trigger ON public.profiles;
CREATE TRIGGER validate_profile_security_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_security();