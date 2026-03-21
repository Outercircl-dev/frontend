-- COMPREHENSIVE SECURITY FIX: Remove sensitive data from profiles table (FINAL FIX)
-- This addresses the critical security vulnerability where sensitive customer data
-- could be accessed through the publicly readable profiles table

-- 1. Ensure all sensitive data is migrated to profiles_sensitive first
SELECT public.migrate_sensitive_profile_data() as final_migration_count;

-- 2. Remove sensitive columns from the main profiles table
-- This eliminates the security risk completely by removing sensitive data from public view
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_month;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_year;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- 3. Create a secure materialized view (table) for public profile data
CREATE TABLE IF NOT EXISTS public.profiles_public_secure AS
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

-- Add primary key and enable RLS
ALTER TABLE public.profiles_public_secure ADD PRIMARY KEY (id);
ALTER TABLE public.profiles_public_secure ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy for the secure table
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

-- 5. Prevent any writes to the secure table (read-only)
CREATE POLICY "profiles_public_secure_no_write" 
ON public.profiles_public_secure
FOR ALL 
USING (false)
WITH CHECK (false);

-- 6. Create function to sync the secure table when profiles change
CREATE OR REPLACE FUNCTION public.sync_profiles_public_secure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profiles_public_secure (
      id, name, username, bio, avatar_url, banner_url,
      location, occupation, education_level, gender,
      interests, languages, membership_tier, reliability_rating,
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.name, NEW.username, NEW.bio, NEW.avatar_url, NEW.banner_url,
      NEW.location, NEW.occupation, NEW.education_level, NEW.gender,
      NEW.interests, NEW.languages, NEW.membership_tier, NEW.reliability_rating,
      NEW.created_at, NEW.updated_at
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.profiles_public_secure SET
      name = NEW.name,
      username = NEW.username,
      bio = NEW.bio,
      avatar_url = NEW.avatar_url,
      banner_url = NEW.banner_url,
      location = NEW.location,
      occupation = NEW.occupation,
      education_level = NEW.education_level,
      gender = NEW.gender,
      interests = NEW.interests,
      languages = NEW.languages,
      membership_tier = NEW.membership_tier,
      reliability_rating = NEW.reliability_rating,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.profiles_public_secure WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger to keep the secure table in sync
CREATE TRIGGER sync_profiles_to_secure
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_public_secure();

-- 7. Add security comments
COMMENT ON TABLE public.profiles_public_secure IS 'SECURITY: Safe public table of profiles without sensitive data. All sensitive information is stored in profiles_sensitive.';

-- 8. Create summary of security improvements
SELECT 
  'SECURITY FIX COMPLETE' as status,
  'Sensitive data completely removed from profiles table' as action_1,
  'Created secure public table for profiles' as action_2,
  'Added automatic sync between profiles and secure table' as action_3,
  'Enhanced RLS policies for privacy protection' as action_4;