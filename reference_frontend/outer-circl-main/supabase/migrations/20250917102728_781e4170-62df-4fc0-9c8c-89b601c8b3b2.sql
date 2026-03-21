-- Fix the database function that's incorrectly trying to access email from profiles table
-- The email field is in profiles_sensitive, not profiles

-- Drop and recreate the problematic function
DROP FUNCTION IF EXISTS public.get_sensitive_profile_data(uuid);

-- Create the corrected function that accesses email from profiles_sensitive table
CREATE OR REPLACE FUNCTION public.get_sensitive_profile_data(requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  phone text,
  birth_month integer,
  birth_year integer,
  stripe_customer_id text,
  account_status text,
  deactivated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow access to own sensitive data
  IF requesting_user_id IS NULL OR requesting_user_id != auth.uid() THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event_secure(
      'unauthorized_sensitive_data_access',
      'profiles_sensitive',
      requesting_user_id,
      false,
      'Attempted access to sensitive profile data'
    );
    RETURN;
  END IF;
  
  -- Rate limit sensitive data access
  IF NOT public.check_rate_limit_sensitive(requesting_user_id, 'sensitive_data_access') THEN
    RETURN;
  END IF;
  
  -- Return sensitive data from the correct table (profiles_sensitive)
  RETURN QUERY
  SELECT 
    ps.id,
    ps.email,
    ps.phone,
    ps.birth_month,
    ps.birth_year,
    ps.stripe_customer_id,
    p.account_status,
    p.deactivated_at
  FROM public.profiles_sensitive ps
  JOIN public.profiles p ON p.id = ps.id
  WHERE ps.id = requesting_user_id;
END;
$$;