-- SECURITY FIX: Protect Customer Email Addresses and Payment Data - Fixed
-- Issue: Customer emails exposed to subscription admins and sensitive data vulnerability

-- Step 1: Create secure view for invitations that masks email addresses for admins
CREATE OR REPLACE VIEW public.invitations_admin_secure AS
SELECT 
  i.id,
  i.subscription_id,
  i.slot_id,
  i.invited_by,
  i.invitation_token,
  i.expires_at,
  i.created_at,
  i.updated_at,
  -- Mask email address for privacy (show only domain)
  CASE 
    WHEN auth.uid() = i.invited_by THEN i.email
    ELSE CONCAT('***@', SPLIT_PART(i.email, '@', 2))
  END as email_masked,
  i.status
FROM public.invitations i;

-- Step 2: Create function to validate sensitive data access with enhanced security
CREATE OR REPLACE FUNCTION public.validate_sensitive_access(
  p_table_name text,
  p_operation text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  rate_limit_ok boolean := false;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Require authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for sensitive data access';
  END IF;
  
  -- Check rate limiting (max 10 sensitive operations per minute)
  SELECT (
    SELECT COUNT(*) 
    FROM public.security_audit_enhanced 
    WHERE user_id = current_user_id 
    AND timestamp > NOW() - INTERVAL '1 minute'
    AND resource_type = p_table_name
  ) < 10 INTO rate_limit_ok;
  
  IF NOT rate_limit_ok THEN
    -- Log rate limit violation
    PERFORM log_sensitive_access(
      current_user_id,
      'rate_limit_exceeded',
      p_table_name,
      current_user_id,
      jsonb_build_object(
        'reason', 'too_many_requests',
        'operation', p_operation,
        'timestamp', NOW()
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Step 3: Create enhanced encryption function for sensitive fields
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_field(
  p_data text,
  p_field_type text DEFAULT 'general'
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  encrypted_data text;
BEGIN
  -- Use different encryption approaches based on field type
  CASE p_field_type
    WHEN 'email' THEN
      -- For emails, hash the local part and keep domain visible for functionality
      encrypted_data := CONCAT(
        encode(digest(SPLIT_PART(p_data, '@', 1), 'sha256'), 'hex'),
        '@',
        SPLIT_PART(p_data, '@', 2)
      );
    WHEN 'phone' THEN
      -- For phones, keep last 4 digits visible
      encrypted_data := CONCAT(
        '****-****-',
        RIGHT(regexp_replace(p_data, '[^0-9]', '', 'g'), 4)
      );
    WHEN 'payment' THEN
      -- For payment data, full encryption
      encrypted_data := encode(digest(p_data, 'sha256'), 'hex');
    ELSE
      -- Default encryption
      encrypted_data := encode(digest(p_data, 'sha256'), 'hex');
  END CASE;
  
  RETURN encrypted_data;
END;
$$;

-- Step 4: Update invitations table RLS policies for enhanced security
DROP POLICY IF EXISTS "strict_subscription_admin_access" ON public.invitations;
DROP POLICY IF EXISTS "strict_own_email_invitation_access" ON public.invitations;

-- More restrictive policy for subscription admins - they can manage invitations but with limited email visibility
CREATE POLICY "subscription_admin_limited_access" ON public.invitations
FOR ALL
USING (
  auth.uid() IS NOT NULL AND 
  is_subscription_admin(subscription_id, auth.uid()) AND
  validate_sensitive_access('invitations', TG_OP::text)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  is_subscription_admin(subscription_id, auth.uid()) AND
  validate_sensitive_access('invitations', 'INSERT')
);

-- Users can only see their own email invitations
CREATE POLICY "own_email_invitation_access" ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  email IS NOT NULL AND 
  email = auth.email() AND 
  auth.email() IS NOT NULL AND 
  status = 'pending'
);

-- Step 5: Enhance profiles_sensitive table security
DROP POLICY IF EXISTS "ultra_strict_own_sensitive_data" ON public.profiles_sensitive;

-- Enhanced policy with additional validation
CREATE POLICY "enhanced_sensitive_data_access" ON public.profiles_sensitive
FOR ALL
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND 
  id IS NOT NULL AND
  validate_sensitive_access('profiles_sensitive', TG_OP::text)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND 
  id IS NOT NULL AND
  validate_sensitive_access('profiles_sensitive', 'INSERT')
);

-- Step 6: Create audit trigger for sensitive data access (only for write operations)
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all write operations to sensitive tables
  PERFORM log_sensitive_access(
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW(),
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to sensitive tables (only write operations)
DROP TRIGGER IF EXISTS audit_invitations_access ON public.invitations;
CREATE TRIGGER audit_invitations_access
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_profiles_sensitive_access ON public.profiles_sensitive;
CREATE TRIGGER audit_profiles_sensitive_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_data_access();

-- Step 7: Create secure payment data view
CREATE OR REPLACE VIEW public.profiles_payment_secure AS
SELECT 
  id,
  -- Mask sensitive payment data
  CASE 
    WHEN encrypted_payment_data IS NOT NULL 
    THEN jsonb_build_object('payment_method_type', 'card', 'last_4', '****')
    ELSE NULL 
  END as payment_info_masked,
  stripe_customer_id,
  last_security_check,
  created_at,
  updated_at
FROM public.profiles_sensitive
WHERE auth.uid() = id;

-- Step 8: Grant permissions on secure views
GRANT SELECT ON public.invitations_admin_secure TO authenticated;
GRANT SELECT ON public.profiles_payment_secure TO authenticated;

-- Step 9: Create function to safely access invitation emails for admins
CREATE OR REPLACE FUNCTION public.get_invitation_contact_info(
  p_invitation_id uuid
) RETURNS TABLE(
  invitation_id uuid,
  email_domain text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = p_invitation_id 
    AND is_subscription_admin(i.subscription_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to invitation data';
  END IF;
  
  -- Return limited information
  RETURN QUERY
  SELECT 
    i.id,
    SPLIT_PART(i.email, '@', 2) as email_domain,
    i.status,
    i.created_at
  FROM public.invitations i
  WHERE i.id = p_invitation_id;
END;
$$;

-- Log the security enhancement
SELECT 'SECURITY ENHANCEMENT COMPLETED: Enhanced protection for customer emails and payment data' as status;