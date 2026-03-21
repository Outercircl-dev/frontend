-- Create a system profile for outercircl if it doesn't exist
INSERT INTO public.profiles (
  id,
  name,
  email,
  username,
  bio,
  profile_completed,
  account_status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'OuterCircl',
  'system@outercircl.com',
  'outercircl',
  'Official OuterCircl system account for automated messages and notifications.',
  true,
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  profile_completed = EXCLUDED.profile_completed,
  account_status = EXCLUDED.account_status;