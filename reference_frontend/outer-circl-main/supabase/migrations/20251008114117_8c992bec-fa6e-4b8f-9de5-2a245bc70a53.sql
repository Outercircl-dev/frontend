-- Phase 2: Secure invitations_safe view with security definer function
-- PostgreSQL doesn't support RLS on views, so we use a security definer function

-- Create a security definer function that returns invitations_safe with access control
CREATE OR REPLACE FUNCTION public.get_invitations_safe(p_invitation_token uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  subscription_id uuid,
  slot_id uuid,
  invited_by uuid,
  invitation_token uuid,
  email_masked text,
  email_hash text,
  status text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return invitations that the user has permission to see
  RETURN QUERY
  SELECT 
    inv.id,
    inv.subscription_id,
    inv.slot_id,
    inv.invited_by,
    inv.invitation_token,
    inv.email_masked,
    inv.email_hash,
    inv.status,
    inv.expires_at,
    inv.created_at,
    inv.updated_at
  FROM public.invitations_safe inv
  WHERE 
    -- Filter by token if provided
    (p_invitation_token IS NULL OR inv.invitation_token = p_invitation_token)
    AND (
      -- Admin access: can see all invitations
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'::app_role
      )
      OR
      -- Subscription admin access: can see invitations they created
      inv.invited_by = auth.uid()
      OR
      -- Recipient access: can see invitations sent to their email (via hash)
      inv.email_hash = encode(digest((SELECT email FROM auth.users WHERE id = auth.uid()), 'sha256'), 'hex')
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_invitations_safe(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_invitations_safe IS 
  'Securely retrieves invitations_safe data with proper access control. Users can only see invitations they created, received, or if they are admins.';