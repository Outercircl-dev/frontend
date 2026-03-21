-- Create the missing log_sensitive_access function that other functions are calling
-- This will be a wrapper around our log_sensitive_access_simple function

CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Call our simplified logging function
  PERFORM public.log_sensitive_access_simple(
    p_user_id,
    p_operation,
    p_table_name,
    p_resource_id
  );
  
  -- If we need the metadata, we could store it in the enhanced audit table
  IF p_metadata IS NOT NULL AND p_metadata != '{}'::jsonb THEN
    INSERT INTO public.security_audit_enhanced (
      user_id,
      action,
      resource_type,
      resource_id,
      metadata,
      timestamp
    ) VALUES (
      p_user_id,
      p_operation,
      p_table_name,
      p_resource_id,
      p_metadata,
      now()
    );
  END IF;
END;
$function$;