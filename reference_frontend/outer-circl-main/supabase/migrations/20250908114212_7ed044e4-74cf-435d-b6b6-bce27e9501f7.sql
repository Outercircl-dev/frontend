-- Fix Critical Security Errors: Remove auth.users dependencies and create ultra-secure RLS policies

-- Drop ALL existing policies with CASCADE to ensure clean slate
DROP POLICY IF EXISTS "invitations_strict_access_control" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "secure_admin_invitation_management" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "secure_invited_user_access" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "secure_token_based_access" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "invitations_admin_full_access" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "invitations_token_readonly_access" ON public.invitations CASCADE;

DROP POLICY IF EXISTS "payment_metadata_enhanced_final" ON public.payment_metadata CASCADE;
DROP POLICY IF EXISTS "payment_metadata_maximum_security" ON public.payment_metadata CASCADE;
DROP POLICY IF EXISTS "payment_metadata_ultra_secure_final" ON public.payment_metadata CASCADE;

DROP POLICY IF EXISTS "profiles_sensitive_enhanced_secure" ON public.profiles_sensitive CASCADE;
DROP POLICY IF EXISTS "profiles_sensitive_ultra_secure_final" ON public.profiles_sensitive CASCADE;
DROP POLICY IF EXISTS "profiles_sensitive_maximum_security_final" ON public.profiles_sensitive CASCADE;

-- Create ultra-secure RLS policies for invitations (simplified access control)
CREATE POLICY "invitations_secure_admin_access"
ON public.invitations
FOR ALL
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

CREATE POLICY "invitations_secure_token_access"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
  AND invitation_token IS NOT NULL
);

-- Create ultra-secure RLS policy for payment_metadata (direct user matching only)
CREATE POLICY "payment_metadata_secure_access"
ON public.payment_metadata
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
);

-- Create ultra-secure RLS policy for profiles_sensitive (direct user matching only)
CREATE POLICY "profiles_sensitive_secure_access"
ON public.profiles_sensitive
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND id IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND id IS NOT NULL
);