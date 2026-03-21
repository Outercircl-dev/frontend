-- Phase 1: Create Tiered Security Functions
-- Replace ultra-restrictive functions with balanced tiers

-- Basic data access: 1-hour account age, reasonable limits
CREATE OR REPLACE FUNCTION public.can_access_basic_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  account_age interval;
BEGIN
  current_user_id := auth.uid();
  
  -- Must be authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must be accessing own data
  IF current_user_id != target_user_id THEN
    RETURN false;
  END IF;
  
  -- Check account age (1 hour minimum)
  SELECT now() - u.created_at INTO account_age
  FROM auth.users u
  WHERE u.id = current_user_id
  AND u.email_confirmed_at IS NOT NULL;
  
  IF account_age IS NULL OR account_age < interval '1 hour' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Sensitive data access: 24-hour account age, moderate limits
CREATE OR REPLACE FUNCTION public.can_access_sensitive_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  account_age interval;
  access_count integer;
BEGIN
  current_user_id := auth.uid();
  
  -- Must be authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must be accessing own data
  IF current_user_id != target_user_id THEN
    RETURN false;
  END IF;
  
  -- Check account age (24 hours minimum)
  SELECT now() - u.created_at INTO account_age
  FROM auth.users u
  WHERE u.id = current_user_id
  AND u.email_confirmed_at IS NOT NULL;
  
  IF account_age IS NULL OR account_age < interval '24 hours' THEN
    RETURN false;
  END IF;
  
  -- Rate limiting: 50 accesses per hour for sensitive data
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = current_user_id
  AND resource_type IN ('profiles_sensitive')
  AND timestamp > now() - interval '1 hour';
  
  IF access_count > 50 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Payment data access: 7-day account age, strict limits
CREATE OR REPLACE FUNCTION public.can_access_payment_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  account_age interval;
  access_count integer;
  recent_login interval;
BEGIN
  current_user_id := auth.uid();
  
  -- Must be authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must be accessing own data
  IF current_user_id != target_user_id THEN
    RETURN false;
  END IF;
  
  -- Check account age (7 days minimum)
  SELECT now() - u.created_at, now() - u.last_sign_in_at INTO account_age, recent_login
  FROM auth.users u
  WHERE u.id = current_user_id
  AND u.email_confirmed_at IS NOT NULL;
  
  IF account_age IS NULL OR account_age < interval '7 days' THEN
    RETURN false;
  END IF;
  
  -- Must have signed in within last 6 hours
  IF recent_login IS NULL OR recent_login > interval '6 hours' THEN
    RETURN false;
  END IF;
  
  -- Rate limiting: 10 accesses per hour for payment data
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = current_user_id
  AND resource_type IN ('payment_metadata')
  AND timestamp > now() - interval '1 hour';
  
  IF access_count > 10 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Smart monitoring function for behavioral analysis
CREATE OR REPLACE FUNCTION public.analyze_user_behavior(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  behavior_score jsonb;
  access_frequency integer;
  ip_diversity integer;
  suspicious_patterns integer;
BEGIN
  -- Analyze access frequency in last hour
  SELECT COUNT(*) INTO access_frequency
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
  AND timestamp > now() - interval '1 hour';
  
  -- Check IP diversity (suspicious if too many different IPs)
  SELECT COUNT(DISTINCT ip_address) INTO ip_diversity
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
  AND timestamp > now() - interval '24 hours';
  
  -- Count suspicious patterns
  SELECT COUNT(*) INTO suspicious_patterns
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
  AND risk_score >= 8
  AND timestamp > now() - interval '1 hour';
  
  -- Build behavior profile
  behavior_score := jsonb_build_object(
    'access_frequency', access_frequency,
    'ip_diversity', ip_diversity,
    'suspicious_patterns', suspicious_patterns,
    'risk_level', CASE
      WHEN suspicious_patterns > 5 THEN 'HIGH'
      WHEN access_frequency > 100 THEN 'MEDIUM'
      WHEN ip_diversity > 5 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    'timestamp', now()
  );
  
  RETURN behavior_score;
END;
$$;

-- Update RLS policies with balanced security

-- Update profiles_sensitive policies
DROP POLICY IF EXISTS "profiles_sensitive_zero_trust_select" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "profiles_sensitive_zero_trust_update" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_balanced_select" 
ON public.profiles_sensitive 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND can_access_sensitive_data(id)
);

CREATE POLICY "profiles_sensitive_balanced_update" 
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
DROP POLICY IF EXISTS "payment_metadata_zero_trust_select" ON public.payment_metadata;
DROP POLICY IF EXISTS "payment_metadata_zero_trust_update" ON public.payment_metadata;

CREATE POLICY "payment_metadata_balanced_select" 
ON public.payment_metadata 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND can_access_payment_data(user_id)
);

CREATE POLICY "payment_metadata_balanced_update" 
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

-- Enhanced audit logging with behavior analysis
CREATE OR REPLACE FUNCTION public.log_balanced_security_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_success boolean DEFAULT true,
  p_metadata text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_behavior jsonb;
  risk_level integer;
BEGIN
  -- Analyze user behavior
  user_behavior := analyze_user_behavior(auth.uid());
  
  -- Calculate risk score based on behavior
  risk_level := CASE 
    WHEN user_behavior->>'risk_level' = 'HIGH' THEN 9
    WHEN user_behavior->>'risk_level' = 'MEDIUM' THEN 5
    WHEN p_resource_type IN ('payment_metadata', 'profiles_sensitive') THEN 3
    ELSE 1
  END;
  
  -- Log the event
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
    risk_level,
    jsonb_build_object(
      'success', p_success,
      'behavior_analysis', user_behavior,
      'metadata', p_metadata,
      'timestamp', now()
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  -- Alert on high-risk behavior
  IF user_behavior->>'risk_level' = 'HIGH' THEN
    INSERT INTO public.security_events_realtime (
      user_id,
      resource_id,
      event_type,
      resource_type,
      risk_score,
      metadata
    ) VALUES (
      auth.uid(),
      p_resource_id,
      'HIGH_RISK_BEHAVIOR',
      p_resource_type,
      9,
      jsonb_build_object(
        'behavior_analysis', user_behavior,
        'action', p_action,
        'alert_timestamp', now()
      )
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to prevent blocking operations
    RAISE WARNING 'Failed to log balanced security event: %', SQLERRM;
END;
$$;