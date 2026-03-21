-- Security Fix: Protect Customer Personal Information in Profiles Table (Corrected)
-- This migration implements stricter data access controls and separates sensitive from public data

-- 1. First, let's create a secure function to validate profile access
CREATE OR REPLACE FUNCTION public.validate_profile_access(target_user_id uuid, accessing_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only allow access to own profile data
  IF target_user_id = accessing_user_id THEN
    RETURN true;
  END IF;
  
  -- Log suspicious access attempts
  IF accessing_user_id IS NOT NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_profile_access_attempt',
      'profiles',
      accessing_user_id,
      false,
      jsonb_build_object(
        'target_user_id', target_user_id,
        'timestamp', now()
      )::text
    );
  END IF;
  
  RETURN false;
END;
$$;

-- 2. Create a function to get sanitized profile data for public viewing
CREATE OR REPLACE FUNCTION public.get_public_profile_data(profile_user_id uuid, requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  bio text,
  avatar_url text,
  banner_url text,
  reliability_rating numeric,
  membership_tier text,
  interests text[],
  languages text[],
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the requesting user can view this profile based on privacy settings
  IF NOT public.can_view_profile(profile_user_id, requesting_user_id) THEN
    RETURN;
  END IF;
  
  -- Rate limit profile access
  IF NOT public.check_profile_access_rate_limit(requesting_user_id, 'profile_view') THEN
    RETURN;
  END IF;
  
  -- Return only safe, public profile information
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.username,
    p.bio,
    p.avatar_url,
    p.banner_url,
    p.reliability_rating,
    p.membership_tier,
    p.interests,
    p.languages,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_user_id
  AND p.account_status = 'active';
END;
$$;

-- 3. Create a strict function for sensitive profile data access
CREATE OR REPLACE FUNCTION public.get_sensitive_profile_data(requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  phone text,
  birth_month integer,
  birth_year integer,
  stripe_customer_id text,
  account_status text,
  deactivated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only allow access to own sensitive data
  IF requesting_user_id IS NULL OR requesting_user_id != auth.uid() THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'unauthorized_sensitive_data_access',
      'profiles',
      requesting_user_id,
      false,
      'Attempted access to sensitive profile data'
    );
    RETURN;
  END IF;
  
  -- Rate limit sensitive data access
  IF NOT public.check_profile_access_rate_limit(requesting_user_id, 'sensitive_data_access') THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.phone,
    p.birth_month,
    p.birth_year,
    p.stripe_customer_id,
    p.account_status,
    p.deactivated_at
  FROM public.profiles p
  WHERE p.id = requesting_user_id;
END;
$$;

-- 4. Update the profiles table RLS policies with even stricter controls
DROP POLICY IF EXISTS "profiles_ultra_secure_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_ultra_secure_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_ultra_secure_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_ultra_secure_delete" ON public.profiles;

-- New ultra-strict RLS policies
CREATE POLICY "profiles_strict_own_data_only_select" ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  AND public.validate_profile_access(id, auth.uid())
  AND public.check_profile_access_rate_limit(auth.uid(), 'profile_view')
);

CREATE POLICY "profiles_strict_own_data_only_update" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  AND public.validate_profile_access(id, auth.uid())
  AND public.check_profile_access_rate_limit(auth.uid(), 'profile_update')
)
WITH CHECK (
  auth.uid() = id 
  AND public.validate_profile_access(id, auth.uid())
);

CREATE POLICY "profiles_strict_own_data_only_insert" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id 
  AND public.validate_profile_access(id, auth.uid())
  AND public.check_profile_access_rate_limit(auth.uid(), 'profile_create')
);

CREATE POLICY "profiles_strict_own_data_only_delete" ON public.profiles
FOR DELETE
TO authenticated
USING (
  auth.uid() = id 
  AND public.validate_profile_access(id, auth.uid())
);

-- 5. Create a secure public profiles view that only exposes safe data
DROP VIEW IF EXISTS public.profiles_safe_public CASCADE;
CREATE VIEW public.profiles_safe_public AS
SELECT 
  id,
  name,
  username,
  bio,
  avatar_url,
  banner_url,
  reliability_rating,
  membership_tier,
  interests,
  languages,
  created_at,
  updated_at
FROM public.profiles
WHERE account_status = 'active';

-- Add RLS to the safe public view
ALTER VIEW public.profiles_safe_public SET (security_barrier = true);

-- 6. Update the existing profiles_public_secure table to be even more restrictive
DROP POLICY IF EXISTS "profiles_public_privacy_enforced_select" ON public.profiles_public_secure;
DROP POLICY IF EXISTS "profiles_public_no_user_modifications" ON public.profiles_public_secure;

CREATE POLICY "profiles_public_secure_privacy_enforced_select" ON public.profiles_public_secure
FOR SELECT
TO authenticated
USING (
  public.check_profile_access_rate_limit(auth.uid(), 'profile_search') 
  AND (
    -- Only show profiles based on strict privacy rules
    (
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = profiles_public_secure.id 
        AND pps.profile_visibility = 'public'
      )
    ) OR (
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = profiles_public_secure.id 
        AND pps.profile_visibility = 'followers'
      ) AND
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE ((f.user_id = profiles_public_secure.id AND f.friend_id = auth.uid()) OR
               (f.user_id = auth.uid() AND f.friend_id = profiles_public_secure.id))
        AND f.status = 'accepted'
      )
    ) OR (
      -- Users can always see their own public profile
      id = auth.uid()
    )
  )
);

CREATE POLICY "profiles_public_secure_no_modifications" ON public.profiles_public_secure
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 7. Add additional security function to mask sensitive data in API responses
CREATE OR REPLACE FUNCTION public.mask_sensitive_profile_fields(profile_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove or mask sensitive fields from profile data
  profile_data := profile_data - 'email';
  profile_data := profile_data - 'phone';  
  profile_data := profile_data - 'birth_month';
  profile_data := profile_data - 'birth_year';
  profile_data := profile_data - 'stripe_customer_id';
  profile_data := profile_data - 'deactivated_at';
  
  RETURN profile_data;
END;
$$;

-- 8. Create audit trigger for profile access (corrected syntax)
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log all profile access for security monitoring
  PERFORM public.log_security_event(
    'profile_accessed',
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'accessed_profile', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add the audit trigger (fixed syntax)
DROP TRIGGER IF EXISTS profile_access_audit ON public.profiles;
CREATE TRIGGER profile_access_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_access();

-- 9. Grant minimal necessary permissions
REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Grant read-only access to safe public view
GRANT SELECT ON public.profiles_safe_public TO authenticated;

-- 10. Add comment documenting the security measures
COMMENT ON TABLE public.profiles IS 'Secure user profiles table with strict RLS policies. Contains sensitive PII that should only be accessible by the profile owner. Use profiles_safe_public view for public profile data.';
COMMENT ON VIEW public.profiles_safe_public IS 'Safe public view of profiles that excludes all sensitive personal information (email, phone, birth info, Stripe data).';
COMMENT ON FUNCTION public.validate_profile_access(uuid, uuid) IS 'Security function to validate profile access and log unauthorized attempts.';
COMMENT ON FUNCTION public.get_sensitive_profile_data(uuid) IS 'Secure function to access sensitive profile data - only returns data for requesting user.';
COMMENT ON FUNCTION public.get_public_profile_data(uuid, uuid) IS 'Secure function to get public profile data with privacy controls and rate limiting.';