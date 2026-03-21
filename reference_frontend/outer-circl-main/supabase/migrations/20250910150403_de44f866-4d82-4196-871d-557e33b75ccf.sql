-- CRITICAL SECURITY FIXES - CORRECTED
-- First, drop existing functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.log_simple_security_event(text,text,uuid,boolean,text);
DROP FUNCTION IF EXISTS public.log_simple_security_event(text,text,uuid,boolean,text,text);

-- Fix 1: Strengthen profiles_sensitive RLS policy
DROP POLICY IF EXISTS "profiles_sensitive_authenticated_owner_only" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_ultra_secure_access" 
ON public.profiles_sensitive
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Fix 2: Strengthen payment_metadata RLS policy
DROP POLICY IF EXISTS "payment_metadata_authenticated_owner_only" ON public.payment_metadata;

CREATE POLICY "payment_metadata_ultra_secure_access"
ON public.payment_metadata  
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
  AND (auth.jwt() ->> 'role') = 'authenticated'
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

-- Fix 3: Secure invitations table 
DROP POLICY IF EXISTS "invitations_subscription_admin_only" ON public.invitations;

CREATE POLICY "invitations_secure_admin_access"
ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "invitations_secure_admin_insert"
ON public.invitations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

CREATE POLICY "invitations_secure_admin_update"
ON public.invitations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- Fix 4: Create corrected security logging function
CREATE OR REPLACE FUNCTION public.log_simple_security_event(
  p_action text,
  p_resource_type text DEFAULT 'general',
  p_resource_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    resource_id,
    action,
    resource_type,
    risk_score,
    metadata,
    timestamp,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_resource_id,
    p_action,
    p_resource_type,
    CASE 
      WHEN NOT p_success THEN 8
      WHEN p_resource_type IN ('profiles_sensitive', 'payment_metadata') THEN 7
      ELSE 3
    END,
    jsonb_build_object(
      'success', p_success,
      'error_message', p_error_message,
      'timestamp', now()
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Security event logging failed: %', SQLERRM;
END;
$$;

-- Fix 5: Add audit triggers for sensitive tables
CREATE OR REPLACE FUNCTION public.trigger_sensitive_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_simple_security_event(
    TG_OP::text,
    TG_TABLE_NAME::text,
    COALESCE(NEW.id, OLD.id),
    true,
    NULL
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply triggers
DROP TRIGGER IF EXISTS profiles_sensitive_audit_trigger ON public.profiles_sensitive;
CREATE TRIGGER profiles_sensitive_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sensitive_audit();

DROP TRIGGER IF EXISTS payment_metadata_audit_trigger ON public.payment_metadata;
CREATE TRIGGER payment_metadata_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sensitive_audit();