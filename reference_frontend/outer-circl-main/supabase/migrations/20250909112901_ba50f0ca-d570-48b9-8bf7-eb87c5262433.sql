-- Add audit trigger to invitations table for security monitoring
CREATE TRIGGER invitations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_access();

-- Ensure the existing log_security_event_secure function has proper search_path for security
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_is_sensitive boolean DEFAULT false,
  p_metadata text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    risk_score,
    timestamp
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    COALESCE(p_metadata::jsonb, '{}'::jsonb),
    CASE WHEN p_is_sensitive THEN 5 ELSE 1 END,
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log audit failures but don't block the operation
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
END;
$$;