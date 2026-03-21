-- Continue fixing remaining function search path issues

-- Find and fix remaining functions that need search_path set
-- Fix log_data_modification function
CREATE OR REPLACE FUNCTION public.log_data_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log data modifications for audit trail
  PERFORM public.log_security_event_secure(
    TG_OP || '_operation', 
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'user_id', auth.uid(),
      'timestamp', now(),
      'record_id', COALESCE(NEW.id, OLD.id)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix enforce_profile_security function
CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Log profile data access for security monitoring
  PERFORM public.log_security_event_secure(
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