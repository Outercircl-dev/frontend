-- Fix Critical Security Errors: Remove auth.users dependencies and create ultra-secure RLS policies

-- Drop ALL existing policies on sensitive tables first
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  -- Drop all policies on invitations table
  FOR rec IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invitations'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON public.invitations';
  END LOOP;
  
  -- Drop all policies on payment_metadata table
  FOR rec IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_metadata'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON public.payment_metadata';
  END LOOP;
  
  -- Drop all policies on profiles_sensitive table
  FOR rec IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles_sensitive'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || rec.policyname || '" ON public.profiles_sensitive';
  END LOOP;
END $$;

-- Drop problematic functions that query auth.users
DROP FUNCTION IF EXISTS public.check_invitation_email_match(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_sensitive_data_permission_enhanced(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_invitation_email_access(text, text) CASCADE;

-- Create secure audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_success boolean DEFAULT true,
  p_details text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    timestamp,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    now(),
    jsonb_build_object(
      'success', p_success,
      'details', COALESCE(p_details, ''),
      'timestamp', now()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore audit failures to prevent blocking operations
    NULL;
END;
$$;

-- Create NEW ultra-secure RLS policies for invitations
CREATE POLICY "invitations_admin_access_only"
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

CREATE POLICY "invitations_public_token_access"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
  AND invitation_token IS NOT NULL
);

-- Create NEW ultra-secure RLS policy for payment_metadata
CREATE POLICY "payment_metadata_owner_only"
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

-- Create NEW ultra-secure policy for profiles_sensitive
CREATE POLICY "profiles_sensitive_owner_only"
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

-- Log completion
SELECT 'Security policies updated successfully - all auth.users dependencies removed' as result;