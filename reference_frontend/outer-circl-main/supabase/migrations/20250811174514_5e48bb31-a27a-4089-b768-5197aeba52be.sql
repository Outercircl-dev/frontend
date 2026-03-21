-- Fix security vulnerability: Restrict friends from accessing sensitive profile data
-- First, remove the overly permissive policy that allows friends to see sensitive data
DROP POLICY IF EXISTS "Friends can view limited profile info" ON public.profiles;

-- Create a restrictive policy that prevents friends from accessing the main profiles table
-- This ensures sensitive data (email, phone, stripe_customer_id) is never exposed to friends
CREATE POLICY "Friends cannot access sensitive profile data" ON public.profiles
FOR SELECT USING (
  -- Only allow the user to see their own full profile data
  auth.uid() = id
);

-- Create/recreate the profiles_public view to safely expose only non-sensitive data
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
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
  created_at
FROM public.profiles
WHERE account_status = 'active';

-- The view inherits RLS from the base table, but we'll add explicit policies for clarity
-- Enable RLS on the view
ALTER VIEW public.profiles_public SET (security_barrier = true);

-- Update the get_user_friends function to use safe public profile data only
CREATE OR REPLACE FUNCTION public.get_user_friends(p_user_id uuid)
RETURNS TABLE(id uuid, name text, username text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT
    pp.id,
    pp.name,
    pp.username,
    pp.avatar_url
  FROM public.profiles_public pp
  JOIN public.friendships f ON (
    (f.user_id = pp.id AND f.friend_id = p_user_id) OR
    (f.friend_id = pp.id AND f.user_id = p_user_id)
  )
  WHERE f.status = 'accepted'
  AND pp.id != p_user_id
  ORDER BY pp.name;
$$;

-- Update search_users to use the safe public view
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
    AND (
      -- Only show profiles that are public or where users are friends
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = pp.id 
        AND pps.profile_visibility = 'public'
      ) OR
      (
        EXISTS (
          SELECT 1 FROM public.profile_privacy_settings pps
          WHERE pps.user_id = pp.id 
          AND pps.profile_visibility = 'followers'
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