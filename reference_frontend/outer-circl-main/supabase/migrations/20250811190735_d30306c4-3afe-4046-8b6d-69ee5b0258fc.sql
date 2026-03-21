-- Security Fix: Add explicit RLS policies to profiles_public view
-- The view needs explicit RLS policies even though it has security controls in its WHERE clause

-- Enable RLS on the profiles_public view
ALTER VIEW public.profiles_public SET (security_invoker=true);

-- Since we can't add RLS policies directly to views, we need to recreate it as a table
-- with proper RLS policies, or create a security definer function approach

-- First, let's create a secure function to get public profile data
CREATE OR REPLACE FUNCTION public.get_public_profiles(requesting_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  name TEXT,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  membership_tier TEXT,
  interests TEXT[],
  languages TEXT[],
  reliability_rating NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
    -- Only authenticated users can access public profiles
    requesting_user_id IS NOT NULL
    AND (
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
          WHERE ((f.user_id = p.id AND f.friend_id = requesting_user_id) OR
                 (f.user_id = requesting_user_id AND f.friend_id = p.id))
          AND f.status = 'accepted'
        )
      )
      OR
      -- Profile owners can always see their own public view
      p.id = requesting_user_id
    );
END;
$$;

-- Drop the old view and recreate it with proper security
DROP VIEW IF EXISTS public.profiles_public;

-- Create a materialized table approach for better security control
CREATE TABLE public.profiles_public_secure (
  id UUID PRIMARY KEY,
  name TEXT,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  membership_tier TEXT,
  interests TEXT[],
  languages TEXT[],
  reliability_rating NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the new secure table
ALTER TABLE public.profiles_public_secure ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the secure public profiles table
CREATE POLICY "authenticated_users_can_view_public_profiles"
ON public.profiles_public_secure
FOR SELECT
TO authenticated
USING (
  -- Only show profiles that should be visible based on privacy settings
  EXISTS (
    SELECT 1 FROM public.profile_privacy_settings pps
    WHERE pps.user_id = profiles_public_secure.id 
    AND pps.profile_visibility = 'public'
  )
  OR 
  -- Follower-only profiles visible to friends
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
  OR
  -- Profile owners can see their own public data
  profiles_public_secure.id = auth.uid()
);

-- Prevent any modifications to this table by users
CREATE POLICY "no_user_modifications"
ON public.profiles_public_secure
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Create a function to refresh the secure public profiles data
CREATE OR REPLACE FUNCTION public.refresh_profiles_public_secure()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  refresh_count INTEGER := 0;
BEGIN
  -- Clear existing data
  DELETE FROM public.profiles_public_secure;
  
  -- Insert current public profile data (non-sensitive fields only)
  INSERT INTO public.profiles_public_secure (
    id, name, username, bio, avatar_url, banner_url, 
    membership_tier, interests, languages, reliability_rating, created_at
  )
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
  WHERE p.account_status = 'active';
  
  GET DIAGNOSTICS refresh_count = ROW_COUNT;
  
  RETURN refresh_count;
END;
$$;

-- Create a trigger to keep the secure table updated
CREATE OR REPLACE FUNCTION public.sync_profiles_public_secure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profiles_public_secure (
      id, name, username, bio, avatar_url, banner_url,
      membership_tier, interests, languages, reliability_rating, created_at
    ) VALUES (
      NEW.id, NEW.name, NEW.username, NEW.bio, NEW.avatar_url, NEW.banner_url,
      NEW.membership_tier, NEW.interests, NEW.languages, NEW.reliability_rating, NEW.created_at
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.profiles_public_secure SET
      name = NEW.name,
      username = NEW.username,
      bio = NEW.bio,
      avatar_url = NEW.avatar_url,
      banner_url = NEW.banner_url,
      membership_tier = NEW.membership_tier,
      interests = NEW.interests,
      languages = NEW.languages,
      reliability_rating = NEW.reliability_rating,
      updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.profiles_public_secure WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_profiles_public_secure_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_public_secure_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_public_secure();

-- Initial population of the secure table
SELECT public.refresh_profiles_public_secure();

-- Create a safe view that applications can use
CREATE VIEW public.profiles_public AS
SELECT * FROM public.profiles_public_secure;

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_public_secure TO authenticated;
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(UUID) TO authenticated;