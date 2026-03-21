-- Security Fix: Simplify and strengthen RLS policies for profiles table
-- Remove all existing duplicate and conflicting policies

DROP POLICY IF EXISTS "Friends cannot access sensitive profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create clean, secure RLS policies with clear purposes
-- Only profile owners can access their full sensitive profile data

CREATE POLICY "profile_owner_full_access_select" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profile_owner_full_access_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_owner_full_access_update" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_owner_full_access_delete" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = id);

-- Ensure the profiles_public view is properly secured for public profile viewing
-- This view only exposes non-sensitive profile information

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public 
WITH (security_invoker=true) AS
SELECT 
  p.id,
  p.name,
  p.username,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.membership_tier,
  p.interests,
  p.languages,
  p.reliability_rating,
  p.created_at
FROM public.profiles p
WHERE 
  -- Only show profiles that allow public visibility or for friends
  (
    -- Public profiles are visible to authenticated users
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = p.id 
      AND pps.profile_visibility = 'public'
    )
    OR 
    -- Follower-only profiles are visible to friends
    (
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = p.id 
        AND pps.profile_visibility = 'followers'
      )
      AND
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE ((f.user_id = p.id AND f.friend_id = auth.uid()) OR
               (f.user_id = auth.uid() AND f.friend_id = p.id))
        AND f.status = 'accepted'
      )
    )
    OR
    -- Profile owners can always see their own public view
    p.id = auth.uid()
  );

-- Create security definer function for safe profile access checks
CREATE OR REPLACE FUNCTION public.user_can_view_profile_public(profile_id UUID, viewer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  profile_visibility TEXT;
  are_friends BOOLEAN := FALSE;
BEGIN
  -- Profile owner can always view their own profile
  IF profile_id = viewer_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get profile visibility setting
  SELECT COALESCE(pps.profile_visibility, 'public') 
  INTO profile_visibility
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = profile_id;
  
  -- If profile is public, allow viewing
  IF profile_visibility = 'public' THEN
    RETURN TRUE;
  END IF;
  
  -- If profile is set to followers only, check friendship
  IF profile_visibility = 'followers' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE ((f.user_id = profile_id AND f.friend_id = viewer_id) OR
             (f.user_id = viewer_id AND f.friend_id = profile_id))
      AND f.status = 'accepted'
    ) INTO are_friends;
    
    RETURN are_friends;
  END IF;
  
  -- Default to deny access
  RETURN FALSE;
END;
$$;

-- Log this security improvement
PERFORM public.log_security_event(
  'profiles_rls_policies_strengthened',
  'profiles',
  auth.uid(),
  TRUE,
  'Simplified and strengthened RLS policies for profiles table to prevent unauthorized access to sensitive data'
);