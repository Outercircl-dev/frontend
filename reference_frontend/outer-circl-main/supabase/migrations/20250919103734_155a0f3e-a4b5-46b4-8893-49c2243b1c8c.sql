-- Create admin user for luckygirldad7@gmail.com
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user ID for luckygirldad7@gmail.com from auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'luckygirldad7@gmail.com' 
  LIMIT 1;
  
  -- Only proceed if user exists
  IF admin_user_id IS NOT NULL THEN
    -- Insert admin role for this user (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User with email luckygirldad7@gmail.com not found';
  END IF;
END $$;