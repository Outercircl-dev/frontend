-- Fix invitation email harvesting vulnerability
-- Tighten RLS policies to prevent cross-subscription email access

-- Drop existing policies
DROP POLICY IF EXISTS "invitations_admin_select_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_admin_create_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_admin_update_only" ON public.invitations;

-- Create stricter policies that ensure admins can only access their own invitations
CREATE POLICY "invitations_creator_select_only" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "invitations_creator_create_only" 
ON public.invitations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "invitations_creator_update_only" 
ON public.invitations 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- Allow invited users to view invitations sent to them (for acceptance flow)
CREATE POLICY "invitations_recipient_view_only" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() 
    AND u.email = invitations.email
    AND u.email_confirmed_at IS NOT NULL
  )
);