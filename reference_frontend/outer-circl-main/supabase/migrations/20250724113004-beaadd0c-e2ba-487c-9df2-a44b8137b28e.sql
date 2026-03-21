-- Fix the audit function to handle JSONB subtraction properly
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log profile changes
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'profile_updated',
      'profile',
      NEW.id,
      true,
      'Profile updated'
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'profile_created',
      'profile',
      NEW.id,
      true,
      'Profile created'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;