-- Fix remaining critical security issues - Views handling

-- 1. Fix profiles_sensitive table RLS policies (CRITICAL)
DROP POLICY IF EXISTS "profiles_sensitive_strict_owner" ON public.profiles_sensitive;
CREATE POLICY "profiles_sensitive_strict_owner" ON public.profiles_sensitive
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  -- Add additional security check to prevent bypass
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
);

-- 2. Check if profiles_payment_secure is a table or view and handle accordingly
DO $$
BEGIN
  -- Try to enable RLS only if it's a table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_payment_secure'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.profiles_payment_secure ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "payment_secure_owner_only" ON public.profiles_payment_secure;
    EXECUTE 'CREATE POLICY "payment_secure_owner_only" ON public.profiles_payment_secure
    FOR ALL USING (
      auth.uid() IS NOT NULL AND 
      auth.uid() = id AND
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
    )';
  ELSE
    -- It's a view, recreate it with security invoker
    DROP VIEW IF EXISTS public.profiles_payment_secure CASCADE;
    EXECUTE 'CREATE VIEW public.profiles_payment_secure 
    WITH (security_invoker = true) AS
    SELECT 
      id,
      payment_info_masked,
      last_security_check,
      created_at,
      updated_at,
      stripe_customer_id
    FROM payment_metadata
    WHERE auth.uid() IS NOT NULL AND auth.uid() = user_id';
  END IF;
END $$;

-- 3. Fix invitations_admin_secure table RLS policies 
DO $$
BEGIN
  -- Check if it's a table or view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations_admin_secure'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.invitations_admin_secure ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "admin_secure_invitations_policy" ON public.invitations_admin_secure;
    EXECUTE 'CREATE POLICY "admin_secure_invitations_policy" ON public.invitations_admin_secure
    FOR ALL USING (
      auth.uid() IS NOT NULL AND
      has_role(auth.uid(), ''admin''::app_role)
    )';
  ELSE
    -- It's a view, recreate it with security invoker
    DROP VIEW IF EXISTS public.invitations_admin_secure CASCADE;
    EXECUTE 'CREATE VIEW public.invitations_admin_secure 
    WITH (security_invoker = true) AS
    SELECT 
      id,
      subscription_id,
      slot_id,
      invited_by,
      invitation_token,
      expires_at,
      created_at,
      updated_at,
      LEFT(email, 3) || ''***@'' || SPLIT_PART(email, ''@'', 2) as email_masked,
      status
    FROM invitations
    WHERE auth.uid() IS NOT NULL AND has_role(auth.uid(), ''admin''::app_role)';
  END IF;
END $$;

-- 4. Fix events_secure_view RLS policies
DO $$
BEGIN
  -- Check if it's a table or view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events_secure_view'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.events_secure_view ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "events_secure_view_policy" ON public.events_secure_view;
    EXECUTE 'CREATE POLICY "events_secure_view_policy" ON public.events_secure_view
    FOR SELECT USING (
      auth.uid() IS NOT NULL AND (
        auth.uid() = host_id OR
        EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = events_secure_view.id 
          AND ep.user_id = auth.uid() 
          AND ep.status = ''attending''
        ) OR
        (status = ''active'' AND date >= CURRENT_DATE)
      )
    )';
  ELSE
    -- It's a view, recreate it with security invoker
    DROP VIEW IF EXISTS public.events_secure_view CASCADE;
    EXECUTE 'CREATE VIEW public.events_secure_view 
    WITH (security_invoker = true) AS
    SELECT 
      e.id,
      e.date,
      e.time,
      e.max_attendees,
      e.host_id,
      e.coordinates,
      e.created_at,
      e.updated_at,
      e.title,
      e.description,
      e.location,
      e.duration,
      e.category,
      e.status,
      e.image_url
    FROM events e
    WHERE 
      auth.uid() IS NOT NULL AND (
        auth.uid() = e.host_id OR
        EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = e.id 
          AND ep.user_id = auth.uid() 
          AND ep.status = ''attending''
        ) OR
        (e.status = ''active'' AND e.date >= CURRENT_DATE)
      )';
  END IF;
END $$;

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

-- 7. Create audit trigger function for sensitive data access (only for real tables)
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

-- Apply audit triggers only to real tables
DO $$
BEGIN
  -- Only apply to profiles_sensitive if it's a real table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_sensitive'
    AND table_type = 'BASE TABLE'
  ) THEN
    DROP TRIGGER IF EXISTS audit_profiles_sensitive_access ON public.profiles_sensitive;
    EXECUTE 'CREATE TRIGGER audit_profiles_sensitive_access
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
      FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access()';
  END IF;
  
  -- Only apply to payment_metadata if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_metadata'
    AND table_type = 'BASE TABLE'
  ) THEN
    DROP TRIGGER IF EXISTS audit_payment_metadata_access ON public.payment_metadata;
    EXECUTE 'CREATE TRIGGER audit_payment_metadata_access
      AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
      FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access()';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles_public_secure TO authenticated;
GRANT SELECT ON public.user_activity_summary_secure TO authenticated;

-- 8. Add additional security indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_security_audit_user_time 
ON public.security_audit_enhanced(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_email_pending 
ON public.invitations(email) WHERE status = 'pending';

-- Status check
SELECT 'CRITICAL SECURITY FIXES APPLIED SUCCESSFULLY' as status;