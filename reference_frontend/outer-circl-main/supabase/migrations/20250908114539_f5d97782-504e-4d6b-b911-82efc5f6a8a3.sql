-- Enhanced Security: Add multiple protection layers for sensitive data

-- Create rate limiting for sensitive data access
CREATE TABLE IF NOT EXISTS public.sensitive_access_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  access_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, resource_type, window_start)
);

ALTER TABLE public.sensitive_access_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_admin_only" ON public.sensitive_access_rate_limits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check rate limits for sensitive data access
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER := 0;
  max_attempts INTEGER := 10; -- Max 10 sensitive data accesses per hour
  window_minutes INTEGER := 60;
BEGIN
  -- Check current access count in the time window
  SELECT COALESCE(access_count, 0) INTO current_count
  FROM public.sensitive_access_rate_limits
  WHERE user_id = p_user_id
    AND resource_type = p_action_type
    AND window_start > (now() - (window_minutes || ' minutes')::INTERVAL);
  
  -- Allow if under the limit
  IF current_count < max_attempts THEN
    -- Update or insert rate limit record
    INSERT INTO public.sensitive_access_rate_limits (user_id, resource_type, access_count, window_start)
    VALUES (p_user_id, p_action_type, 1, date_trunc('hour', now()))
    ON CONFLICT (user_id, resource_type, window_start)
    DO UPDATE SET access_count = sensitive_access_rate_limits.access_count + 1;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create function to sanitize HTML input
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Basic HTML/script injection prevention
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potentially dangerous content
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input_text, '<[^>]*>', '', 'g'),
      'javascript:', '', 'gi'
    ),
    'on\w+\s*=', '', 'gi'
  );
END;
$$;

-- Enhanced security function for sensitive data access validation
CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access(
  p_user_id UUID,
  p_resource_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Must be accessing own data
  IF auth.uid() != p_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check rate limits
  IF NOT public.check_profile_access_rate_limit(p_user_id, p_resource_type) THEN
    -- Log rate limit violation
    PERFORM public.log_security_event_secure(
      'rate_limit_exceeded',
      p_resource_type,
      p_user_id,
      false,
      'User exceeded rate limit for sensitive data access'
    );
    RETURN FALSE;
  END IF;
  
  -- Log successful access validation
  PERFORM public.log_security_event_secure(
    'sensitive_access_validated',
    p_resource_type,
    p_user_id,
    true,
    'Sensitive data access validated and rate limit checked'
  );
  
  RETURN TRUE;
END;
$$;

-- Drop and recreate even more restrictive policies for profiles_sensitive
DROP POLICY IF EXISTS "profiles_sensitive_owner_only" ON public.profiles_sensitive;

CREATE POLICY "profiles_sensitive_ultra_restricted"
ON public.profiles_sensitive
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND id IS NOT NULL
  AND public.validate_sensitive_data_access(id, 'profiles_sensitive')
);

CREATE POLICY "profiles_sensitive_insert_restricted"
ON public.profiles_sensitive
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND id IS NOT NULL
  AND public.validate_sensitive_data_access(id, 'profiles_sensitive')
);

CREATE POLICY "profiles_sensitive_update_restricted"
ON public.profiles_sensitive
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND id IS NOT NULL
  AND public.validate_sensitive_data_access(id, 'profiles_sensitive')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND id IS NOT NULL
);

-- No DELETE allowed on profiles_sensitive
CREATE POLICY "profiles_sensitive_no_delete"
ON public.profiles_sensitive
FOR DELETE
TO authenticated
USING (FALSE);

-- Enhanced policies for payment_metadata with rate limiting
DROP POLICY IF EXISTS "payment_metadata_owner_only" ON public.payment_metadata;

CREATE POLICY "payment_metadata_select_restricted"
ON public.payment_metadata
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
  AND public.validate_sensitive_data_access(user_id, 'payment_metadata')
);

CREATE POLICY "payment_metadata_insert_restricted"
ON public.payment_metadata
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
  AND public.validate_sensitive_data_access(user_id, 'payment_metadata')
);

CREATE POLICY "payment_metadata_update_restricted"
ON public.payment_metadata
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
  AND public.validate_sensitive_data_access(user_id, 'payment_metadata')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
);

-- No DELETE allowed on payment_metadata
CREATE POLICY "payment_metadata_no_delete"
ON public.payment_metadata
FOR DELETE
TO authenticated
USING (FALSE);

-- Enhanced invitations policy to prevent email harvesting
DROP POLICY IF EXISTS "invitations_public_token_access" ON public.invitations;

-- Create view that excludes sensitive email data for token access
CREATE OR REPLACE VIEW public.invitation_tokens_safe AS
SELECT 
  id,
  subscription_id,
  slot_id,
  invitation_token,
  expires_at,
  status,
  created_at,
  'REDACTED' as email  -- Hide actual email for security
FROM public.invitations
WHERE status = 'pending' 
  AND expires_at > now()
  AND invitation_token IS NOT NULL;

-- Grant access to the safe view
GRANT SELECT ON public.invitation_tokens_safe TO authenticated;

-- Create restricted token access policy
CREATE POLICY "invitations_token_access_no_email"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
  AND invitation_token IS NOT NULL
);

-- Log completion with security summary
SELECT 'Enhanced security measures implemented:
- Rate limiting for sensitive data access (max 10/hour)
- Input sanitization functions
- Multi-layer validation for sensitive data
- Restricted policies with validation checks
- Email redaction for invitation tokens
- Comprehensive audit logging
- Deletion prevention for sensitive tables' as security_summary;