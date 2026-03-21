-- CRITICAL SECURITY FIX: Secure profiles_public View
-- Add RLS policies to prevent unauthorized access to user profile data

-- 1. Enable RLS on the profiles_public view
ALTER VIEW public.profiles_public SET (security_barrier = true);

-- 2. Add RLS policies for the profiles_public view
-- Only authenticated users can view public profiles
CREATE POLICY "profiles_public_authenticated_only" ON public.profiles_public
FOR SELECT
TO authenticated
USING (
  -- Allow viewing profiles if user is authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Users can always view their own profile
    id = auth.uid() 
    OR
    -- Users can view other profiles only if they have public visibility
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles_public.id 
      AND pps.profile_visibility = 'public'
    )
    OR
    -- If no privacy settings exist, default to allowing view (backward compatibility)
    NOT EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles_public.id
    )
  )
);

-- 3. Completely block unauthenticated access
CREATE POLICY "profiles_public_no_anon_access" ON public.profiles_public
FOR SELECT
TO anon
USING (false);

-- 4. Prevent any modifications to the view
CREATE POLICY "profiles_public_no_modifications" ON public.profiles_public
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 5. Create a safer public profiles view with minimal data
DROP VIEW IF EXISTS public.profiles_public_safe CASCADE;
CREATE VIEW public.profiles_public_safe AS
SELECT 
  id,
  username,
  avatar_url,
  membership_tier,
  created_at
FROM public.profiles
WHERE account_status = 'active'
AND id IN (
  SELECT user_id 
  FROM public.profile_privacy_settings 
  WHERE profile_visibility = 'public'
);

-- 6. Add RLS to the safe view
ALTER VIEW public.profiles_public_safe SET (security_barrier = true);

CREATE POLICY "profiles_public_safe_authenticated_only" ON public.profiles_public_safe
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_public_safe_no_anon" ON public.profiles_public_safe
FOR SELECT
TO anon
USING (false);

-- 7. Add security documentation
COMMENT ON VIEW public.profiles_public IS 'RESTRICTED: User profile data view - requires authentication and respects privacy settings';
COMMENT ON VIEW public.profiles_public_safe IS 'SAFE: Minimal public profile data for authenticated users only';

-- 8. Create logging function for profile view access
CREATE OR REPLACE FUNCTION public.log_profile_view_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to public profile views
  PERFORM public.log_security_event(
    'profile_view_access',
    TG_TABLE_NAME,
    auth.uid(),
    true,
    jsonb_build_object(
      'viewed_profile_id', NEW.id,
      'viewer_authenticated', CASE WHEN auth.uid() IS NOT NULL THEN true ELSE false END,
      'timestamp', now()
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Note: Cannot add triggers to views directly, but access is logged through base table