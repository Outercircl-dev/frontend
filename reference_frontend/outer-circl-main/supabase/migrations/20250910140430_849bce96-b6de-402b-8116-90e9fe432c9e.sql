-- Final security hardening: Fix remaining issues without verification function
-- Simplified approach focusing on core security fixes

-- Fix invitations table - make it truly private
DROP POLICY IF EXISTS "invitations_enhanced_admin_access" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_access_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_select_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_create_only" ON public.invitations;
DROP POLICY IF EXISTS "invitations_creator_update_only" ON public.invitations;

-- Create single comprehensive policy for invitations
CREATE POLICY "invitations_admin_access_only" 
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
  AND expires_at > now()
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

-- Update profiles_sensitive policies 
DROP POLICY IF EXISTS "profiles_sensitive_balanced_select" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "profiles_sensitive_balanced_update" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_secure_select" 
ON public.profiles_sensitive 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND can_access_sensitive_data(id)
);

CREATE POLICY "profiles_sensitive_secure_update" 
ON public.profiles_sensitive 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND can_access_sensitive_data(id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Update payment_metadata policies
DROP POLICY IF EXISTS "payment_metadata_balanced_select" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_balanced_update" ON public.payment_metadata;

CREATE POLICY "payment_metadata_secure_select" 
ON public.payment_metadata 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND can_access_payment_data(user_id)
);

CREATE POLICY "payment_metadata_secure_update" 
ON public.payment_metadata 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND can_access_payment_data(user_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Revoke public access to sensitive tables
REVOKE ALL ON public.profiles_sensitive FROM public, anon;
REVOKE ALL ON public.payment_metadata FROM public, anon;
REVOKE ALL ON public.invitations FROM public, anon;

-- Grant minimal necessary access only to authenticated users through RLS
GRANT SELECT, UPDATE, INSERT ON public.profiles_sensitive TO authenticated;
GRANT SELECT, UPDATE, INSERT ON public.payment_metadata TO authenticated;
GRANT SELECT, UPDATE, INSERT ON public.invitations TO authenticated;

-- Add comprehensive monitoring trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on sensitive tables
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
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    TG_TABLE_NAME,
    9, -- Maximum risk score for sensitive operations
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'authenticated', auth.uid() IS NOT NULL
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply monitoring to all sensitive tables
DROP TRIGGER IF EXISTS profiles_sensitive_monitor ON public.profiles_sensitive;
CREATE TRIGGER profiles_sensitive_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operations();

DROP TRIGGER IF EXISTS payment_metadata_monitor ON public.payment_metadata;  
CREATE TRIGGER payment_metadata_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operations();

DROP TRIGGER IF EXISTS invitations_monitor ON public.invitations;
CREATE TRIGGER invitations_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operations();