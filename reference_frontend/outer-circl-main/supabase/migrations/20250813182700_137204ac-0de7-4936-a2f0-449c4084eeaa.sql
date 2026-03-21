-- Fix critical security issues - Corrected version

-- 1. Fix profiles_sensitive table RLS policies (CRITICAL)
DROP POLICY IF EXISTS "profiles_sensitive_strict_owner" ON public.profiles_sensitive;
CREATE POLICY "profiles_sensitive_strict_owner" ON public.profiles_sensitive
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  -- Add additional security check to prevent bypass
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
);

-- 2. Fix profiles_payment_secure table RLS policies (CRITICAL)
ALTER TABLE public.profiles_payment_secure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_secure_owner_only" ON public.profiles_payment_secure;
CREATE POLICY "payment_secure_owner_only" ON public.profiles_payment_secure
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  -- Ensure user exists in auth.users
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
);

-- 3. Fix invitations_admin_secure table RLS policies 
ALTER TABLE public.invitations_admin_secure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_secure_invitations_policy" ON public.invitations_admin_secure;
CREATE POLICY "admin_secure_invitations_policy" ON public.invitations_admin_secure
FOR ALL USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix events_secure_view RLS policies
ALTER TABLE public.events_secure_view ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_secure_view_policy" ON public.events_secure_view;
CREATE POLICY "events_secure_view_policy" ON public.events_secure_view
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- User is the host
    auth.uid() = host_id OR
    -- User is a participant
    EXISTS (
      SELECT 1 FROM event_participants ep 
      WHERE ep.event_id = events_secure_view.id 
      AND ep.user_id = auth.uid() 
      AND ep.status = 'attending'
    ) OR
    -- Event is public and active
    (status = 'active' AND date >= CURRENT_DATE)
  )
);

-- 5. Drop and recreate problematic security definer views
DROP VIEW IF EXISTS public.profiles_public_secure CASCADE;
CREATE VIEW public.profiles_public_secure 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.reliability_rating,
  p.created_at,
  p.updated_at,
  p.name,
  p.username,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.location,
  p.occupation,
  p.education_level,
  p.gender,
  p.interests,
  p.languages,
  p.membership_tier
FROM profiles p
WHERE 
  -- Only show profiles where user has permission to view
  auth.uid() IS NOT NULL AND (
    -- User's own profile
    auth.uid() = p.id OR
    -- Public profiles
    EXISTS (
      SELECT 1 FROM profile_privacy_settings pps 
      WHERE pps.user_id = p.id 
      AND pps.profile_visibility = 'public'
    ) OR
    -- Friend's profiles when visibility is 'followers'
    (
      EXISTS (
        SELECT 1 FROM profile_privacy_settings pps 
        WHERE pps.user_id = p.id 
        AND pps.profile_visibility = 'followers'
      ) AND
      EXISTS (
        SELECT 1 FROM friendships f 
        WHERE ((f.user_id = p.id AND f.friend_id = auth.uid()) OR 
               (f.user_id = auth.uid() AND f.friend_id = p.id)) 
        AND f.status = 'accepted'
      )
    )
  );

-- 6. Drop and recreate user_activity_summary_secure view
DROP VIEW IF EXISTS public.user_activity_summary_secure CASCADE;
CREATE VIEW public.user_activity_summary_secure 
WITH (security_invoker = true) AS
SELECT 
  p.id as user_id,
  COALESCE(COUNT(uah.id), 0) as total_activities,
  COUNT(DISTINCT uah.category) as categories_participated,
  MAX(uah.last_activity_date) as last_activity_date,
  jsonb_object_agg(
    COALESCE(uah.category, 'unknown'), 
    COALESCE(uah.activity_count, 0)
  ) FILTER (WHERE uah.category IS NOT NULL) as activities_by_category,
  MAX(uah.updated_at) as updated_at,
  p.name as user_name
FROM profiles p
LEFT JOIN user_activity_history uah ON p.id = uah.user_id
WHERE auth.uid() = p.id  -- Users can only see their own activity summary
GROUP BY p.id, p.name;

-- 7. Create audit trigger function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to sensitive data using the existing function
  PERFORM public.log_security_event_secure(
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'timestamp', now(),
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to sensitive tables (only for INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS audit_profiles_sensitive_access ON public.profiles_sensitive;
CREATE TRIGGER audit_profiles_sensitive_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_profiles_payment_secure_access ON public.profiles_payment_secure;
CREATE TRIGGER audit_profiles_payment_secure_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_payment_secure
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

-- 8. Create security monitoring function
CREATE OR REPLACE FUNCTION public.check_security_violations()
RETURNS TABLE (
  violation_type text,
  severity text,
  count bigint,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can run security checks
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  -- Check for suspicious access patterns
  SELECT 
    'suspicious_access' as violation_type,
    'high' as severity,
    COUNT(*)::bigint as count,
    jsonb_build_object(
      'description', 'High-risk access to sensitive data',
      'time_window', '1 hour'
    ) as details
  FROM security_audit_enhanced 
  WHERE 
    timestamp > now() - interval '1 hour'
    AND risk_score >= 8
  HAVING COUNT(*) > 10

  UNION ALL

  -- Check for failed authentication attempts
  SELECT 
    'failed_auth' as violation_type,
    'medium' as severity,
    COUNT(*)::bigint as count,
    jsonb_build_object(
      'description', 'Multiple failed authentication attempts',
      'time_window', '15 minutes'
    ) as details
  FROM security_audit_enhanced 
  WHERE 
    timestamp > now() - interval '15 minutes'
    AND action = 'failed_login'
  HAVING COUNT(*) > 5;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles_public_secure TO authenticated;
GRANT SELECT ON public.user_activity_summary_secure TO authenticated;