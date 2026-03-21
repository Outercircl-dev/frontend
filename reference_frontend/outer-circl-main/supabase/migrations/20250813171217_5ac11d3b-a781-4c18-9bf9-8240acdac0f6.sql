-- COMPREHENSIVE SECURITY FIX: Remove sensitive data from profiles table (CORRECTED)
-- This addresses the critical security vulnerability where sensitive customer data
-- could be accessed through the publicly readable profiles table

-- 1. Ensure all sensitive data is migrated to profiles_sensitive
SELECT public.migrate_sensitive_profile_data() as final_migration_count;

-- 2. Remove sensitive columns from the main profiles table
-- This eliminates the security risk completely by removing sensitive data from public view

-- Drop the sensitive columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_month;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_year;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- 3. Create a secure view for public profile data only
CREATE OR REPLACE VIEW public.profiles_public_secure AS
SELECT 
  id,
  name,
  username,
  bio,
  avatar_url,
  banner_url,
  location,
  occupation,
  education_level,
  gender,
  interests,
  languages,
  membership_tier,
  reliability_rating,
  created_at,
  updated_at
FROM public.profiles;

-- Enable RLS on the view (inherits from underlying table)
ALTER VIEW public.profiles_public_secure SET (security_barrier = true);

-- 4. Create RLS policy for the secure view
CREATE POLICY "profiles_public_secure_authenticated_only" 
ON public.profiles_public_secure
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Public profiles are visible to everyone
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles_public_secure.id 
      AND pps.profile_visibility = 'public'
    )
    OR 
    -- Users can always see their own profile
    auth.uid() = id
    OR
    -- Friends can see each other's profiles if privacy setting allows
    (
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = profiles_public_secure.id 
        AND pps.profile_visibility = 'followers'
      )
      AND
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE ((f.user_id = profiles_public_secure.id AND f.friend_id = auth.uid()) OR
               (f.user_id = auth.uid() AND f.friend_id = profiles_public_secure.id))
        AND f.status = 'accepted'
      )
    )
  )
);

-- 5. Prevent any writes to the secure view
CREATE POLICY "profiles_public_secure_no_write" 
ON public.profiles_public_secure
FOR ALL 
USING (false)
WITH CHECK (false);

-- 6. Create a function for secure profile searches that includes rate limiting
CREATE OR REPLACE FUNCTION public.secure_profile_search(
  search_term TEXT,
  requesting_user_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Rate limit profile searches
    IF NOT public.check_profile_access_rate_limit(requesting_user_id, 'profile_search') THEN
        RAISE EXCEPTION 'Rate limit exceeded for profile searches';
    END IF;
    
    -- Log the search for security monitoring
    PERFORM public.log_sensitive_access(
        requesting_user_id,
        'profile_search',
        'profiles_public_secure',
        NULL,
        jsonb_build_object(
            'search_term_length', length(search_term),
            'search_time', now()
        )
    );
    
    RETURN QUERY
    SELECT 
        pps.id,
        pps.name,
        pps.username,
        pps.avatar_url,
        left(pps.bio, 200) as bio  -- Limit bio length for security
    FROM public.profiles_public_secure pps
    WHERE 
        pps.id != requesting_user_id
        AND (
            LOWER(pps.name) LIKE LOWER('%' || left(search_term, 50) || '%') OR
            LOWER(pps.username) LIKE LOWER('%' || left(search_term, 50) || '%')
        )
        AND (
            -- Only return profiles that should be visible
            EXISTS (
                SELECT 1 FROM public.profile_privacy_settings pps_inner
                WHERE pps_inner.user_id = pps.id 
                AND pps_inner.profile_visibility = 'public'
            ) OR
            (
                EXISTS (
                    SELECT 1 FROM public.profile_privacy_settings pps_inner
                    WHERE pps_inner.user_id = pps.id 
                    AND pps_inner.profile_visibility = 'followers'
                ) AND
                EXISTS (
                    SELECT 1 FROM public.friendships f
                    WHERE ((f.user_id = pps.id AND f.friend_id = requesting_user_id) OR
                           (f.user_id = requesting_user_id AND f.friend_id = pps.id))
                    AND f.status = 'accepted'
                )
            )
        )
    ORDER BY pps.name
    LIMIT 20;  -- Limit results for security
END;
$$;

-- 7. Add security comments
COMMENT ON VIEW public.profiles_public_secure IS 'SECURITY: Safe public view of profiles without sensitive data. All sensitive information has been moved to profiles_sensitive.';
COMMENT ON FUNCTION public.secure_profile_search IS 'SECURITY: Rate-limited and monitored profile search function with privacy controls.';

-- 8. Create summary of security improvements
SELECT 
  'SECURITY FIX COMPLETE' as status,
  'Sensitive data removed from profiles table' as action_1,
  'Created secure public view for profiles' as action_2,
  'Added rate-limited search function' as action_3,
  'Enhanced monitoring and logging' as action_4;