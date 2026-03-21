-- FIX SECURITY LINTER WARNINGS - Phase 1 Security Hardening Fixes

-- 1. Fix Function Search Path Mutable warnings by setting search_path
-- Update existing functions to include proper search_path settings

-- Fix log_sensitive_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  risk_score INTEGER := 0;
BEGIN
  -- Calculate basic risk score
  IF p_action IN ('payment_access', 'sensitive_data_export') THEN
    risk_score := 50;
  END IF;
  
  -- Log the access
  INSERT INTO public.security_audit_enhanced (
    user_id, action, resource_type, resource_id, 
    risk_score, metadata
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    risk_score, p_metadata
  );
END;
$$;

-- Fix migrate_sensitive_profile_data function
CREATE OR REPLACE FUNCTION public.migrate_sensitive_profile_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  migrated_count INTEGER := 0;
  profile_record RECORD;
BEGIN
  -- Migrate sensitive data from profiles to profiles_sensitive
  FOR profile_record IN 
    SELECT id, email, phone, birth_month, birth_year, stripe_customer_id
    FROM public.profiles
    WHERE id NOT IN (SELECT id FROM public.profiles_sensitive)
  LOOP
    INSERT INTO public.profiles_sensitive (
      id, email, phone, birth_month, birth_year, stripe_customer_id
    ) VALUES (
      profile_record.id,
      profile_record.email,
      profile_record.phone,
      profile_record.birth_month,
      profile_record.birth_year,
      profile_record.stripe_customer_id
    );
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  RETURN migrated_count;
END;
$$;

-- Fix sanitize_html_input function
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potential XSS vectors
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input_text, '<[^>]*>', '', 'g'),
      'javascript:', '', 'gi'
    ),
    'on\w+\s*=', '', 'gi'
  );
END;
$$;

-- Fix check_profile_access_rate_limit function
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count recent requests
  SELECT COUNT(*) INTO current_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND action = p_action_type
    AND timestamp >= window_start;
  
  -- Log this check
  PERFORM public.log_sensitive_access(
    p_user_id,
    'rate_limit_check',
    'security',
    NULL,
    jsonb_build_object(
      'action_type', p_action_type,
      'current_count', current_count,
      'limit', p_max_requests
    )
  );
  
  RETURN current_count < p_max_requests;
END;
$$;

-- Fix log_sensitive_data_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to sensitive data
  PERFORM public.log_sensitive_access(
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Address Extension in Public warning
-- Note: This is documented but needs admin access to move extensions
-- We'll document this as a manual step for the user

-- 3. Create documentation for manual fixes needed
SELECT 'Security Functions Updated - Search paths secured. Manual fixes needed: 1) Move extensions from public schema (requires admin access), 2) Enable leaked password protection in Supabase Auth settings' as security_update_status;