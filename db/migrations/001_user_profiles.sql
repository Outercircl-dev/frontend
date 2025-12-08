-- Migration: 001_user_profiles.sql
-- Description: Create user profiles table for OuterCircl FFP
-- SRS Requirements: F1 (User Registration), F7 (User Profile & Preferences)
-- Run this in Supabase SQL Editor

-- Create gender enum type
CREATE TYPE public.gender_type AS ENUM (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info (Onboarding Step 1)
  full_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender_type NOT NULL,
  profile_picture_url VARCHAR(512),
  
  -- Interests & Preferences (Onboarding Steps 2 & 3)
  bio TEXT CHECK (char_length(bio) <= 500),
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  hobbies TEXT[] DEFAULT ARRAY[]::TEXT[],
  availability JSONB DEFAULT '{}'::jsonb,
  distance_radius_km INT DEFAULT 25 CHECK (distance_radius_km BETWEEN 1 AND 100),
  
  -- Compliance (Onboarding Step 4)
  accepted_tos BOOLEAN NOT NULL DEFAULT false,
  accepted_guidelines BOOLEAN NOT NULL DEFAULT false,
  accepted_tos_at TIMESTAMP WITH TIME ZONE,
  accepted_guidelines_at TIMESTAMP WITH TIME ZONE,
  
  -- Status flags
  profile_completed BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,  -- For host verification (future)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT interests_min_3 CHECK (
    profile_completed = false OR jsonb_array_length(interests) >= 3
  ),
  CONSTRAINT interests_max_10 CHECK (jsonb_array_length(interests) <= 10),
  CONSTRAINT hobbies_max_10 CHECK (array_length(hobbies, 1) IS NULL OR array_length(hobbies, 1) <= 10),
  CONSTRAINT age_18_plus CHECK (
    date_of_birth <= CURRENT_DATE - INTERVAL '18 years'
  )
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_interests ON public.user_profiles USING GIN (interests);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at DESC);
CREATE INDEX idx_user_profiles_completed ON public.user_profiles(profile_completed) WHERE profile_completed = true;

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Interests Reference Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  icon VARCHAR(10),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for interests (public read access)
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view interests"
  ON public.interests FOR SELECT
  TO authenticated
  USING (true);

-- Seed interests data
INSERT INTO public.interests (slug, name, category, icon, sort_order) VALUES
  -- Sports & Fitness
  ('running', 'Running', 'Sports & Fitness', '🏃', 1),
  ('cycling', 'Cycling', 'Sports & Fitness', '🚴', 2),
  ('swimming', 'Swimming', 'Sports & Fitness', '🏊', 3),
  ('hiking', 'Hiking', 'Sports & Fitness', '🥾', 4),
  ('yoga', 'Yoga', 'Sports & Fitness', '🧘', 5),
  ('gym', 'Gym & Fitness', 'Sports & Fitness', '💪', 6),
  ('cold_plunge', 'Cold Plunge', 'Sports & Fitness', '🧊', 7),
  -- Social
  ('coffee', 'Coffee Meetups', 'Social', '☕', 10),
  ('brunch', 'Brunch', 'Social', '🥂', 11),
  ('pub_quiz', 'Pub Quiz', 'Social', '🍺', 12),
  ('board_games', 'Board Games', 'Social', '🎲', 13),
  ('dinner_parties', 'Dinner Parties', 'Social', '🍽️', 14),
  -- Creative
  ('art', 'Art', 'Creative', '🎨', 20),
  ('photography', 'Photography', 'Creative', '📷', 21),
  ('music', 'Music', 'Creative', '🎵', 22),
  ('writing', 'Writing', 'Creative', '✍️', 23),
  ('crafts', 'Crafts', 'Creative', '🧶', 24),
  -- Learning
  ('book_club', 'Book Club', 'Learning', '📚', 30),
  ('languages', 'Languages', 'Learning', '🗣️', 31),
  ('tech', 'Tech & Gadgets', 'Learning', '💻', 32),
  ('coding', 'Coding', 'Learning', '👨‍💻', 33),
  ('business', 'Business', 'Learning', '💼', 34),
  -- Outdoors
  ('walking', 'Walking', 'Outdoors', '🚶', 40),
  ('gardening', 'Gardening', 'Outdoors', '🌱', 41),
  ('beach', 'Beach', 'Outdoors', '🏖️', 42),
  ('camping', 'Camping', 'Outdoors', '⛺', 43),
  ('nature', 'Nature Walks', 'Outdoors', '🌿', 44),
  -- Wellness
  ('meditation', 'Meditation', 'Wellness', '🧘', 50),
  ('mindfulness', 'Mindfulness', 'Wellness', '🙏', 51),
  ('cooking', 'Cooking', 'Wellness', '🍳', 52),
  ('nutrition', 'Nutrition', 'Wellness', '🥗', 53);

-- ============================================
-- Storage bucket for profile pictures
-- ============================================

-- Create storage bucket (run this separately in Supabase Storage section or via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

