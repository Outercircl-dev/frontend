-- SECURITY FIX: Protect customer emails and payment data from unauthorized access

-- Step 1: Tighten invitations table RLS policies to prevent email harvesting
-- Drop existing policies to rebuild them securely
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations for their subscriptions" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations for their subscriptions" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage invitations for their subscription" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations for their subscriptions" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view invitations for their subscriptions" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations for their subscription" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations for their verified email only" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.invitations;

-- Create secure RLS policies for invitations table
CREATE POLICY "subscription_admins_full_access" ON public.invitations
FOR ALL
USING (is_subscription_admin(subscription_id, auth.uid()))
WITH CHECK (is_subscription_admin(subscription_id, auth.uid()));

CREATE POLICY "users_view_own_email_invitations_only" ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  email = auth.email() AND 
  auth.email() IS NOT NULL
);

-- Step 2: Strengthen profiles_sensitive table security
-- Drop existing policy to rebuild it more securely
DROP POLICY IF EXISTS "users_own_sensitive_data_only" ON public.profiles_sensitive;

-- Create ultra-strict RLS policy for profiles_sensitive
CREATE POLICY "strict_own_sensitive_data_only" ON public.profiles_sensitive
FOR ALL
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  id IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  id IS NOT NULL
);

-- Step 3: Add security audit logging

-- Create a security function to audit sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  user_id uuid,
  operation text,
  table_name text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log sensitive data access for security monitoring
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    success,
    error_message
  ) VALUES (
    user_id,
    operation,
    table_name,
    resource_id,
    inet_client_addr(),
    true,
    metadata::text
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let logging failures block operations
    NULL;
END;
$$;

-- Add triggers to log access to sensitive tables (INSERT, UPDATE, DELETE only)
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Apply logging triggers to sensitive tables
DROP TRIGGER IF EXISTS log_profiles_sensitive_access ON public.profiles_sensitive;
CREATE TRIGGER log_profiles_sensitive_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

DROP TRIGGER IF EXISTS log_invitations_access ON public.invitations;
CREATE TRIGGER log_invitations_access
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

-- Step 4: Create a secure view for invitation management that doesn't expose emails
CREATE OR REPLACE VIEW public.invitations_secure AS
SELECT 
  i.id,
  i.subscription_id,
  i.slot_id,
  i.invited_by,
  i.invitation_token,
  i.expires_at,
  i.created_at,
  i.updated_at,
  i.status,
  -- Only show email to subscription admins or the invited user
  CASE 
    WHEN is_subscription_admin(i.subscription_id, auth.uid()) OR i.email = auth.email()
    THEN i.email
    ELSE '[REDACTED]'
  END as email
FROM public.invitations i
WHERE 
  -- Apply same RLS logic as the table
  is_subscription_admin(i.subscription_id, auth.uid()) OR
  (auth.uid() IS NOT NULL AND i.email = auth.email() AND auth.email() IS NOT NULL);

-- Grant access to authenticated users
GRANT SELECT ON public.invitations_secure TO authenticated;

-- Step 5: Add rate limiting function for sensitive data access
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(
  user_id uuid,
  operation text DEFAULT 'profile_access'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow 50 profile accesses per hour per user
  RETURN public.check_rate_limit(
    user_id,
    NULL,
    operation,
    50,  -- max requests
    60   -- window in minutes
  );
EXCEPTION
  WHEN OTHERS THEN
    -- On error, log and allow access to prevent blocking legitimate users
    RAISE WARNING 'Profile access rate limit check failed: %', SQLERRM;
    RETURN true;
END;
$$;

-- Step 6: Create a secure profiles search function with rate limiting
CREATE OR REPLACE FUNCTION public.secure_profile_search(search_term text, requesting_user_id uuid)
RETURNS TABLE(id uuid, name text, username text, avatar_url text, bio text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Rate limit profile searches
    IF NOT public.check_profile_access_rate_limit(requesting_user_id, 'profile_search') THEN
        RAISE EXCEPTION 'Rate limit exceeded for profile searches';
    END IF;
    
    -- Log the search for security monitoring
    PERFORM public.log_security_event(
        'profile_search',
        'profiles_public_secure',
        requesting_user_id,
        TRUE,
        jsonb_build_object(
            'search_term_length', length(search_term),
            'search_time', now()
        )::text
    );
    
    RETURN QUERY
    SELECT 
        pps.id,
        pps.name,
        pps.username,
        pps.avatar_url,
        left(pps.bio, 200) as bio  -- Limit bio length for security
    FROM public.profiles_public_secure pps
    WHERE 
        pps.id != requesting_user_id
        AND (
            LOWER(pps.name) LIKE LOWER('%' || left(search_term, 50) || '%') OR
            LOWER(pps.username) LIKE LOWER('%' || left(search_term, 50) || '%')
        )
        AND (
            -- Only return profiles that should be visible
            EXISTS (
                SELECT 1 FROM public.profile_privacy_settings pps_inner
                WHERE pps_inner.user_id = pps.id 
                AND pps_inner.profile_visibility = 'public'
            ) OR
            (
                EXISTS (
                    SELECT 1 FROM public.profile_privacy_settings pps_inner
                    WHERE pps_inner.user_id = pps.id 
                    AND pps_inner.profile_visibility = 'followers'
                ) AND
                EXISTS (
                    SELECT 1 FROM public.friendships f
                    WHERE ((f.user_id = pps.id AND f.friend_id = requesting_user_id) OR
                           (f.user_id = requesting_user_id AND f.friend_id = pps.id))
                    AND f.status = 'accepted'
                )
            )
        )
    ORDER BY pps.name
    LIMIT 20;  -- Limit results for security
END;
$$;

-- Step 7: Add logging function for security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type text,
    resource_type text,
    user_id uuid,
    success boolean,
    details text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        action,
        resource_type,
        success,
        error_message,
        ip_address
    ) VALUES (
        user_id,
        event_type,
        resource_type,
        success,
        details,
        inet_client_addr()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Don't let logging failures block operations
        NULL;
END;
$$;

-- Log the security fix
SELECT 'SECURITY FIX APPLIED: Email and payment data protection enhanced with strict RLS policies, access logging, and rate limiting' as status;