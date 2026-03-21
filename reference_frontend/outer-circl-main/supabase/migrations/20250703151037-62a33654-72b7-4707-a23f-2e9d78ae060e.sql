-- Update default profile visibility to public for new users
ALTER TABLE public.profile_privacy_settings 
ALTER COLUMN profile_visibility SET DEFAULT 'public';

-- Update existing users to have public profiles
UPDATE public.profile_privacy_settings 
SET profile_visibility = 'public' 
WHERE profile_visibility = 'friends';

-- Ensure all users have friend requests enabled (remove any restrictions)
UPDATE public.profile_privacy_settings 
SET allow_friend_requests = true 
WHERE allow_friend_requests = false;