-- COMPREHENSIVE SECURITY FIX: Remove sensitive data from profiles table (FINAL)
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

-- 3. Drop existing secure table if it exists and recreate it properly
DROP TABLE IF EXISTS public.profiles_public_secure CASCADE;

-- Create a secure table for public profile data (no sensitive information)
CREATE TABLE public.profiles_public_secure (
  id UUID PRIMARY KEY,
  name TEXT,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  location TEXT,
  occupation TEXT,
  education_level TEXT,
  gender TEXT,
  interests TEXT[],
  languages TEXT[],
  membership_tier TEXT,
  reliability_rating NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Populate with existing data (without sensitive fields)
INSERT INTO public.profiles_public_secure (
  id, name, username, bio, avatar_url, banner_url,
  location, occupation, education_level, gender,
  interests, languages, membership_tier, reliability_rating,
  created_at, updated_at
)
SELECT 
  id, name, username, bio, avatar_url, banner_url,
  location, occupation, education_level, gender,
  interests, languages, membership_tier, reliability_rating,
  created_at, updated_at
FROM public.profiles;

-- Enable RLS on the secure table
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

-- 5. Prevent any writes to the secure table (read-only for users)
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

-- 8. Verify no sensitive data remains in main profiles table
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('email', 'phone', 'birth_month', 'birth_year', 'stripe_customer_id');