-- Create admin user for dave@outercircl.com
-- First, we need to find the user ID for this email and make them admin

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user ID for dave@outercircl.com from auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'dave@outercircl.com' 
  LIMIT 1;
  
  -- Only proceed if user exists
  IF admin_user_id IS NOT NULL THEN
    -- Insert admin role for this user (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User with email dave@outercircl.com not found';
  END IF;
END $$;