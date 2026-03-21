-- Create a function to prevent deactivated accounts from being reactivated
CREATE OR REPLACE FUNCTION public.prevent_deactivated_account_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if account is deactivated
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.id AND account_status = 'deactivated'
  ) THEN
    RAISE EXCEPTION 'Account has been permanently deactivated and cannot be accessed';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent deactivated account access
-- Note: This will be triggered when auth.users table is accessed
-- but we'll handle this at the application level instead

-- Add a database function to check account status during authentication
CREATE OR REPLACE FUNCTION public.check_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_status TEXT;
BEGIN
  -- Get the account status from profiles
  SELECT account_status INTO profile_status
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- If account is deactivated, prevent any operations
  IF profile_status = 'deactivated' THEN
    RAISE EXCEPTION 'This account has been permanently deactivated and cannot be accessed.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update account deactivation to be more permanent
-- Add a deactivated_at timestamp to track when deactivation occurred
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE;