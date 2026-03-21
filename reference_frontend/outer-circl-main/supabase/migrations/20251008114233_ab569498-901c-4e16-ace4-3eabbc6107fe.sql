-- Phase 1a: Create secure email retrieval function
-- This allows authorized users to retrieve invitation emails securely

CREATE OR REPLACE FUNCTION public.get_invitation_email_by_token(p_token uuid)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_email TEXT;
  invitation_inviter UUID;
  invitation_subscription_id UUID;
BEGIN
  -- Get invitation details
  SELECT email, invited_by, subscription_id
  INTO invitation_email, invitation_inviter, invitation_subscription_id
  FROM public.invitations
  WHERE invitation_token = p_token
  AND status = 'pending'
  AND expires_at > now();
  
  -- Return NULL if invitation not found
  IF invitation_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Only return email if user is the inviter, subscription admin, or an admin
  IF NOT (
    auth.uid() = invitation_inviter OR
    EXISTS (
      SELECT 1 FROM public.membership_subscriptions ms
      WHERE ms.id = invitation_subscription_id 
      AND ms.admin_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::app_role
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to invitation email';
  END IF;
  
  -- Log the access for security audit
  PERFORM public.log_security_event_secure(
    'invitation_email_accessed',
    'invitations',
    auth.uid(),
    true,
    jsonb_build_object(
      'invitation_token', p_token,
      'accessed_by', auth.uid(),
      'access_time', now()
    )::text
  );
  
  RETURN invitation_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_invitation_email_by_token(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_invitation_email_by_token IS 
  'Securely retrieves invitation email for authorized users only (inviter, subscription admin, or system admin)';