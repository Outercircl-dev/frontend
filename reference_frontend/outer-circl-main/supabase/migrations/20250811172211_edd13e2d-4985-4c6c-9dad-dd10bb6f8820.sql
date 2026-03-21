-- Fix the security definer view issue
-- Drop the view with security definer and recreate without it
DROP VIEW IF EXISTS public.profiles_public;

-- Create the view without security_barrier (which was causing the warning)
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
  membership_tier
FROM public.profiles
WHERE account_status = 'active';

-- Create RLS policy for the view instead
CREATE POLICY "Public profile view access" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow access to public view data only for users with public visibility
  account_status = 'active' AND
  EXISTS (
    SELECT 1 FROM public.profile_privacy_settings pps
    WHERE pps.user_id = profiles.id 
    AND pps.profile_visibility = 'public'
  )
);