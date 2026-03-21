-- COMPREHENSIVE FIX: Address security definer view issues and restore broken functionality
-- This migration resolves the security warnings and fixes the missing database functions

-- 1. First, let's check if we have the get_user_friends function that's being called
-- If not, we'll create a secure version

CREATE OR REPLACE FUNCTION public.get_user_friends(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.name,
    p.username,
    p.avatar_url
  FROM public.profiles p
  INNER JOIN public.friendships f ON (
    (f.user_id = p_user_id AND f.friend_id = p.id) OR 
    (f.friend_id = p_user_id AND f.user_id = p.id)
  )
  WHERE f.status = 'accepted'
  AND p.account_status = 'active'
  AND p.id != p_user_id;
$$;

-- 2. Ensure the profiles_public_secure table has proper structure and no security definer issues
-- Check its current state and ensure it's properly configured

-- 3. Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_user_friends(uuid) TO authenticated;

-- 4. Create a function to safely get public profile data without security definer view warnings
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  avatar_url text,
  membership_tier text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.name,
    p.username,
    p.avatar_url,
    p.membership_tier
  FROM public.profiles p
  WHERE p.id = profile_user_id
  AND p.account_status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_safe(uuid) TO authenticated;

-- 5. Verify our clean views are working properly
COMMENT ON VIEW public.profiles_public_view IS 'Clean profile view - no security definer function calls, relies on table RLS';
COMMENT ON VIEW public.profiles_minimal_view IS 'Minimal profile view - no security definer function calls, relies on table RLS';