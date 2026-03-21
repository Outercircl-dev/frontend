-- Ensure 'standard' is the default membership tier for all existing and new users
UPDATE public.profiles 
SET membership_tier = 'standard' 
WHERE membership_tier IS NULL OR membership_tier = 'free';

-- Add a default constraint to ensure new profiles get 'standard' tier
ALTER TABLE public.profiles 
ALTER COLUMN membership_tier SET DEFAULT 'standard';

-- Create index for faster membership tier queries
CREATE INDEX IF NOT EXISTS idx_profiles_membership_tier 
ON public.profiles(membership_tier);

-- Create index for better performance on event queries
CREATE INDEX IF NOT EXISTS idx_events_status_date 
ON public.events(status, date);

-- Create index for notifications performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications(user_id, created_at DESC);

-- Create index for better friend queries
CREATE INDEX IF NOT EXISTS idx_friendships_status 
ON public.friendships(status, user_id, friend_id);

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.membership_tier IS 'User membership tier: standard (default), premium, admin';

-- Log the migration
INSERT INTO public.security_audit_log (action, resource_type, success, error_message, created_at)
VALUES ('membership_tier_migration', 'profiles', true, 'Updated default membership tier to standard and added performance indexes', NOW());