-- Create the missing log_security_event function that matches the expected signature
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type text,
    description text,
    user_id uuid,
    success boolean,
    ip_address text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Call the existing secure logging function
    PERFORM log_security_event_secure(event_type, description, user_id, success, ip_address);
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the main operation
        RAISE WARNING 'Security logging failed: %', SQLERRM;
END;
$$;