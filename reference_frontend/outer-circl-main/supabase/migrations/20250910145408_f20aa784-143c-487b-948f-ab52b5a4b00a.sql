-- Fix Critical RLS Policy Issues
-- Address the security scanner errors for sensitive data tables

-- 1. Fix profiles_sensitive RLS policies
DROP POLICY IF EXISTS "profiles_sensitive_ultra_secure" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_authenticated_owner_only" 
ON public.profiles_sensitive 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
) 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- 2. Fix payment_metadata RLS policies
DROP POLICY IF EXISTS "payment_metadata_ultra_secure" ON public.payment_metadata;

CREATE POLICY "payment_metadata_authenticated_owner_only" 
ON public.payment_metadata 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND auth.jwt() IS NOT NULL
  AND (auth.jwt() ->> 'aud') = 'authenticated'
) 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- 3. Fix invitations RLS policies - only subscription admins can access
DROP POLICY IF EXISTS "invitations_secure_admin_only" ON public.invitations;

CREATE POLICY "invitations_subscription_admin_only" 
ON public.invitations 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
) 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- 4. Create simplified security logging function
CREATE OR REPLACE FUNCTION public.log_simple_security_event(
  p_action text,
  p_resource_type text DEFAULT 'system',
  p_resource_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_metadata text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple security logging without complex analysis
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
      WHEN p_resource_type IN ('profiles_sensitive', 'payment_metadata') THEN 7
      WHEN p_success = false THEN 5
      ELSE 3
    END,
    jsonb_build_object(
      'action', p_action,
      'success', p_success,
      'metadata', p_metadata,
      'timestamp', now()
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to prevent breaking app functionality
    NULL;
END;
$$;

-- 5. Fix search_path issues in existing functions
ALTER FUNCTION public.sanitize_html_input(text) SET search_path = public;
ALTER FUNCTION public.sanitize_event_inputs() SET search_path = public;
ALTER FUNCTION public.sanitize_profile_inputs() SET search_path = public;

-- 6. Remove complex failed functions that don't exist
-- These will be handled by the simplified security manager

-- 7. Ensure basic security functions exist with proper search_path
CREATE OR REPLACE FUNCTION public.simple_input_sanitization(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN input_text;
  END IF;
  
  -- Basic HTML sanitization
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi'),
      '<[^>]*>', '', 'g'
    ),
    '[<>&"'']', '', 'g'
  );
END;
$$;