-- Security Fix: Add enhanced monitoring for sensitive data access attempts
-- This will help track any unauthorized access attempts without breaking existing functionality

-- Create a secure function to check if user has proper access to sensitive data
CREATE OR REPLACE FUNCTION public.validate_sensitive_access(p_user_id uuid, p_resource_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must be accessing own data
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Must have valid JWT
  IF auth.jwt() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must have authenticated role
  IF (auth.jwt() ->> 'role') != 'authenticated' THEN
    RETURN false;
  END IF;
  
  -- Log the access attempt
  PERFORM public.log_security_event_secure(
    'sensitive_data_access',
    p_resource_type,
    p_user_id,
    true,
    jsonb_build_object(
      'access_time', now(),
      'user_authenticated', true,
      'resource_type', p_resource_type
    )::text
  );
  
  RETURN true;
END;
$$;

-- Create function to detect and prevent suspicious access patterns
CREATE OR REPLACE FUNCTION public.check_rate_limit_sensitive(p_user_id uuid, p_resource_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count integer;
BEGIN
  -- Count recent access attempts for this user and resource type
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND timestamp > now() - interval '1 hour';
  
  -- Allow max 100 accesses per hour to sensitive data (reasonable for normal usage)
  IF access_count > 100 THEN
    -- Log the violation
    PERFORM public.log_security_event_secure(
      'rate_limit_violation_sensitive',
      p_resource_type,
      p_user_id,
      true,
      jsonb_build_object(
        'access_count', access_count,
        'time_window', '1 hour',
        'blocked', true
      )::text
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;