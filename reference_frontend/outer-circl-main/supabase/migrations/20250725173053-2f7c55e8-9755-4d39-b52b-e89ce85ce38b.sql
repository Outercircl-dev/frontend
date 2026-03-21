-- Update default membership tier from 'free' to 'standard'
ALTER TABLE profiles ALTER COLUMN membership_tier SET DEFAULT 'standard';

-- Update existing 'free' tier users to 'standard'
UPDATE profiles SET membership_tier = 'standard' WHERE membership_tier = 'free';