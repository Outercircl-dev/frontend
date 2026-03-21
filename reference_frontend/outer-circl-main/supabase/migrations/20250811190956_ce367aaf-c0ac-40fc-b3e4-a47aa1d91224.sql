-- Fix the security definer view issue
-- Remove the problematic view and use security invoker instead

DROP VIEW IF EXISTS public.profiles_public;

-- Create a secure view with security_invoker (default behavior)
-- This ensures it runs with the permissions of the calling user, not the creator
CREATE VIEW public.profiles_public 
WITH (security_invoker=true) AS
SELECT 
  pps.id,
  pps.name,
  pps.username,
  pps.bio,
  pps.avatar_url,
  pps.banner_url,
  pps.membership_tier,
  pps.interests,
  pps.languages,
  pps.reliability_rating,
  pps.created_at
FROM public.profiles_public_secure pps;

-- Grant appropriate permissions to the view
GRANT SELECT ON public.profiles_public TO authenticated;

-- Also update the search function to be more secure
DROP FUNCTION IF EXISTS public.search_users(text, uuid);
CREATE OR REPLACE FUNCTION public.search_users(search_term text, requesting_user_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  username text, 
  avatar_url text, 
  bio text, 
  friendship_status text
)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    pp.id,
    pp.name,
    pp.username,
    pp.avatar_url,
    pp.bio,
    CASE 
      WHEN f.status IS NOT NULL THEN f.status
      WHEN f2.status IS NOT NULL THEN f2.status
      ELSE 'none'
    END as friendship_status
  FROM public.profiles_public_secure pp
  LEFT JOIN public.friendships f ON (
    (f.user_id = pp.id AND f.friend_id = requesting_user_id) OR
    (f.user_id = requesting_user_id AND f.friend_id = pp.id)
  )
  LEFT JOIN public.friendships f2 ON (
    (f2.user_id = requesting_user_id AND f2.friend_id = pp.id) OR
    (f2.user_id = pp.id AND f2.friend_id = requesting_user_id)
  )
  WHERE 
    pp.id != requesting_user_id
    AND (
      LOWER(pp.name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(pp.username) LIKE LOWER('%' || search_term || '%')
    )
    AND (
      -- Only show profiles that are visible according to privacy settings
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps_inner
        WHERE pps_inner.user_id = pp.id 
        AND pps_inner.profile_visibility = 'public'
      ) OR
      (
        EXISTS (
          SELECT 1 FROM public.profile_privacy_settings pps_inner
          WHERE pps_inner.user_id = pp.id 
          AND pps_inner.profile_visibility = 'followers'
        ) AND
        EXISTS (
          SELECT 1 FROM public.friendships f3
          WHERE ((f3.user_id = pp.id AND f3.friend_id = requesting_user_id) OR
                 (f3.user_id = requesting_user_id AND f3.friend_id = pp.id))
          AND f3.status = 'accepted'
        )
      )
    )
  ORDER BY 
    pp.name;
END;
$$;