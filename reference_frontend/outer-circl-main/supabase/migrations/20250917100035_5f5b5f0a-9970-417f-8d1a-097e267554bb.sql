-- Fix the enforce_profile_security trigger function to not reference fields that don't exist in profiles table
CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure only authenticated users can access profiles
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for profile access';
  END IF;
  
  -- Prevent ID tampering on updates
  IF TG_OP = 'UPDATE' AND NEW.id != OLD.id THEN
    RAISE EXCEPTION 'Profile ID cannot be changed';
  END IF;
  
  -- Ensure users can only modify their own profile
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Users can only modify their own profile data';
  END IF;
  
  -- Log profile data access for security monitoring (only fields that exist in profiles table)
  PERFORM public.log_security_event(
    'profile_data_access',
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'accessed_user_id', NEW.id,
      'operation', TG_OP,
      'timestamp', now(),
      'has_name', CASE WHEN NEW.name IS NOT NULL THEN true ELSE false END,
      'has_bio', CASE WHEN NEW.bio IS NOT NULL THEN true ELSE false END,
      'has_avatar', CASE WHEN NEW.avatar_url IS NOT NULL THEN true ELSE false END
    )::text
  );
  
  RETURN NEW;
END;
$$;