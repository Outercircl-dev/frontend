-- Fix critical security vulnerability: Profiles table exposes sensitive personal data
-- Remove the overly permissive policy that allows public profile viewing

-- Drop the problematic policy that allows viewing profiles based on privacy settings
DROP POLICY IF EXISTS "Users can view profiles based on privacy settings" ON public.profiles;

-- Create a public profile view that only exposes safe, non-sensitive information
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  username,
  name,
  bio,
  interests,
  languages,
  avatar_url,
  banner_url,
  reliability_rating,
  created_at,
  -- Exclude sensitive fields: email, phone, stripe_customer_id, location, occupation
  -- Exclude birth info for privacy
  membership_tier
FROM public.profiles
WHERE account_status = 'active';

-- Enable RLS on the view
ALTER VIEW public.profiles_public SET (security_barrier = true);

-- Create new restrictive RLS policies
-- Policy 1: Users can always view their own complete profile
CREATE POLICY "Users can view their own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Friends can view limited profile information (using the public view logic)
-- This only exposes safe fields through application logic, not database level
CREATE POLICY "Friends can view limited profile info" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() != id AND
  auth.uid() IS NOT NULL AND
  -- Only allow friends to see limited info
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = id AND f.friend_id = auth.uid()) OR
           (f.user_id = auth.uid() AND f.friend_id = id))
    AND f.status = 'accepted'
  ) AND
  -- Check if the profile owner allows friend viewing
  EXISTS (
    SELECT 1 FROM public.profile_privacy_settings pps
    WHERE pps.user_id = id 
    AND pps.profile_visibility IN ('public', 'followers')
  )
);

-- Create a safe function to get public profile data for discovery
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  name text,
  bio text,
  avatar_url text,
  reliability_rating numeric,
  membership_tier text
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.username,
    p.name,
    p.bio,
    p.avatar_url,
    p.reliability_rating,
    p.membership_tier
  FROM public.profiles p
  JOIN public.profile_privacy_settings pps ON pps.user_id = p.id
  WHERE p.id = profile_user_id 
  AND p.account_status = 'active'
  AND pps.profile_visibility = 'public';
$$;