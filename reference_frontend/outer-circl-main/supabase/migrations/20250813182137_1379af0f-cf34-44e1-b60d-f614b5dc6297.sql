-- CRITICAL SECURITY FIXES (Incremental)
-- Fix only what doesn't already exist

-- Check current policies and fix incrementally

-- 1. Fix EMAIL HARVESTING VULNERABILITY - these policies may not exist yet
DROP POLICY IF EXISTS "invitations_own_email_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_admin_secure" ON public.invitations;  
DROP POLICY IF EXISTS "invitations_rate_limited" ON public.invitations;

-- Create secure invitation policies
CREATE POLICY "invitations_secure_email_access" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
  AND email = auth.email()
  AND status = 'pending'
  AND expires_at > now()
);

CREATE POLICY "invitations_secure_admin_access" 
ON public.invitations 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms 
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 2. Add EMAIL FORMAT VALIDATION if constraint doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_email_format' 
    AND table_name = 'invitations'
  ) THEN
    ALTER TABLE public.invitations 
    ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- 3. SECURE PAYMENT DATA ACCESS
DROP POLICY IF EXISTS "payment_metadata_owner_verified" ON public.payment_metadata;

CREATE POLICY "payment_metadata_secure_owner_only" 
ON public.payment_metadata 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND security_level = 'high'
);

-- 4. ADD SECURITY MONITORING FUNCTION if it doesn't exist
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_details text DEFAULT NULL
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
    risk_score,
    metadata,
    timestamp
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    CASE 
      WHEN p_action LIKE '%sensitive%' THEN 8
      WHEN p_action LIKE '%payment%' THEN 9
      WHEN NOT p_success THEN 7
      ELSE 3
    END,
    jsonb_build_object(
      'success', p_success,
      'details', p_details,
      'ip_address', inet_client_addr(),
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
    ),
    now()
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_security_event_secure(text, text, uuid, boolean, text) TO authenticated;

-- 5. Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_security_audit_user_action_time 
ON public.security_audit_enhanced(user_id, action, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_email_status 
ON public.invitations(email, status) WHERE status = 'pending';

-- Status check
SELECT 'SECURITY HARDENING COMPLETED' as status;