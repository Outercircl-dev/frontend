
-- Add the missing avatar_url column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN avatar_url TEXT;

-- Also add phone column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;
