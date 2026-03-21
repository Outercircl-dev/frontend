-- Add audit trigger to invitations table for security monitoring
CREATE TRIGGER invitations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invitation_access();