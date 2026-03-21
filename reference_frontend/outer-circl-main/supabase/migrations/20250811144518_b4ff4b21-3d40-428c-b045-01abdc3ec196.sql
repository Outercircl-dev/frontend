-- Update the default profile visibility to be more privacy-focused
-- Change from 'public' to 'followers' (friends only)
ALTER TABLE public.profile_privacy_settings 
ALTER COLUMN profile_visibility SET DEFAULT 'followers';

-- Also update the message privacy default to be consistent
ALTER TABLE public.profile_privacy_settings 
ALTER COLUMN message_privacy SET DEFAULT 'followers';

-- Update any existing profiles with public visibility to followers (optional - uncomment if you want to apply to existing users)
-- UPDATE public.profile_privacy_settings 
-- SET profile_visibility = 'followers' 
-- WHERE profile_visibility = 'public';