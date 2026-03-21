-- Fix security vulnerability: Restrict friends from accessing sensitive profile data
-- Remove the overly permissive "Friends can view limited profile info" policy
DROP POLICY IF EXISTS "Friends can view limited profile info" ON public.profiles;

-- Create a much more restrictive policy for friends that only allows access to public profile view
-- Friends should NOT have direct access to the profiles table with sensitive data
CREATE POLICY "Friends can view public profile info only" ON public.profiles
FOR SELECT USING (
  -- Only allow friends to see profiles through the profiles_public view
  -- This policy intentionally returns false to prevent direct access
  false
);

-- Ensure the profiles_public view has proper RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable by friends" ON public.profiles_public;

-- Allow authenticated users to view public profile information for friends
CREATE POLICY "Authenticated users can view public profiles" ON public.profiles_public
FOR SELECT TO authenticated USING (
  -- Allow viewing public profile data if:
  -- 1. It's the user's own profile, OR
  -- 2. The profile owner has public visibility, OR  
  -- 3. The profile owner has followers visibility AND they are friends
  id = auth.uid() OR
  (
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles_public.id 
      AND pps.profile_visibility = 'public'
    )
  ) OR
  (
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles_public.id 
      AND pps.profile_visibility = 'followers'
    ) AND
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE ((f.user_id = profiles_public.id AND f.friend_id = auth.uid()) OR
             (f.user_id = auth.uid() AND f.friend_id = profiles_public.id))
      AND f.status = 'accepted'
    )
  )
);

-- Enable RLS on profiles_public if not already enabled
ALTER TABLE public.profiles_public ENABLE ROW LEVEL SECURITY;

-- Update the search_users function to use profiles_public for better security
CREATE OR REPLACE FUNCTION public.search_users(search_term text, requesting_user_id uuid)
RETURNS TABLE(id uuid, name text, username text, avatar_url text, bio text, friendship_status text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
  FROM public.profiles_public pp
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
  ORDER BY 
    pp.name;
END;
$$;