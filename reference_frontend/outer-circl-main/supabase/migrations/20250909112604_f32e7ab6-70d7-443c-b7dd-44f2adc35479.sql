-- Fix invitations table RLS policies for security
-- Remove the conflicting restrictive policy that blocks all access
DROP POLICY IF EXISTS "invitations_deny_all_by_default" ON public.invitations;

-- Remove the existing admin-only policy
DROP POLICY IF EXISTS "invitations_admin_only" ON public.invitations;

-- Create new secure RLS policies for invitations table
-- 1. Only subscription admins can create invitations for their subscriptions
CREATE POLICY "invitations_admin_create_only" 
ON public.invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 2. Only subscription admins can view invitations for their subscriptions
CREATE POLICY "invitations_admin_select_only" 
ON public.invitations 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 3. Only subscription admins can update invitations for their subscriptions
CREATE POLICY "invitations_admin_update_only" 
ON public.invitations 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 4. No deletion of invitations allowed for audit trail
CREATE POLICY "invitations_no_delete" 
ON public.invitations 
FOR DELETE 
TO authenticated
USING (false);

-- Create secure audit logging function for invitation access
CREATE OR REPLACE FUNCTION public.log_invitation_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all invitation access for security monitoring
  PERFORM public.log_security_event_secure(
    CASE TG_OP 
      WHEN 'SELECT' THEN 'invitation_viewed'
      WHEN 'INSERT' THEN 'invitation_created'
      WHEN 'UPDATE' THEN 'invitation_updated'
      WHEN 'DELETE' THEN 'invitation_deleted'
    END,
    'invitations',
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'operation', TG_OP,
      'email_accessed', COALESCE(NEW.email, OLD.email),
      'subscription_id', COALESCE(NEW.subscription_id, OLD.subscription_id)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;