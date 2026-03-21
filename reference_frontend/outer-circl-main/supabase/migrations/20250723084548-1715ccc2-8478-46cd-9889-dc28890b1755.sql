-- Create/update a system account for outercircl using an existing user
-- We'll use the first user (Dave) and create a separate outercircl profile
UPDATE public.profiles 
SET 
  username = 'outercircl_system',
  name = 'OuterCircl',
  bio = 'Official OuterCircl system account for automated messages and notifications.',
  email = 'system@outercircl.com'
WHERE id = '8d86411b-9f43-4a62-b9ac-3a232152d40b';