-- Security Fix: Simple RLS Policy Updates (Avoiding Deadlock)
-- This migration addresses the most critical security vulnerabilities

-- 1. Update invitations table RLS (one policy at a time to avoid deadlock)
DROP POLICY IF EXISTS "invitations_restricted_access" ON public.invitations;

CREATE POLICY "invitations_admin_access_only"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 2. Update profiles_sensitive table RLS for enhanced security
DROP POLICY IF EXISTS "profiles_sensitive_maximum_security_access" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_secure_access"
ON public.profiles_sensitive
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = id
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND validate_sensitive_access(id, 'profiles_sensitive')
  AND check_rate_limit_sensitive(auth.uid(), 'profiles_sensitive')
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = id
  AND validate_sensitive_access(id, 'profiles_sensitive')
);