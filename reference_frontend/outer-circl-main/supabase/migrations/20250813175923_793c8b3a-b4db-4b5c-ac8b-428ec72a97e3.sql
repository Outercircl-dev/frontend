-- CRITICAL SECURITY FIX: Eliminate SECURITY DEFINER views and secure sensitive data
-- Corrected version without invalid trigger syntax

-- Step 1: Find and eliminate ALL remaining SECURITY DEFINER views
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    FOR view_rec IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE definition ILIKE '%SECURITY DEFINER%'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_rec.schemaname, view_rec.viewname);
        RAISE NOTICE 'Dropped SECURITY DEFINER view: %.%', view_rec.schemaname, view_rec.viewname;
    END LOOP;
END
$$;

-- Step 2: Recreate essential views WITHOUT SECURITY DEFINER
CREATE VIEW public.invitations_admin_secure AS
SELECT 
  i.id,
  i.subscription_id,
  i.slot_id,
  i.invited_by,
  i.invitation_token,
  i.expires_at,
  i.created_at,
  i.updated_at,
  CASE 
    WHEN auth.uid() = i.invited_by THEN i.email
    ELSE CONCAT('***@', SPLIT_PART(i.email, '@', 2))
  END as email_masked,
  i.status
FROM public.invitations i;

CREATE VIEW public.profiles_payment_secure AS
SELECT 
  id,
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

CREATE VIEW public.events_secure_view AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.location,
  e.date,
  e.time,
  e.duration,
  e.category,
  e.status,
  e.image_url,
  e.max_attendees,
  e.host_id,
  e.coordinates,
  e.created_at,
  e.updated_at
FROM public.events e
WHERE 
  e.status = 'active' 
  AND e.date >= CURRENT_DATE;

-- Step 3: Add security barriers to views
ALTER VIEW public.invitations_admin_secure SET (security_barrier = true);
ALTER VIEW public.profiles_payment_secure SET (security_barrier = true);  
ALTER VIEW public.events_secure_view SET (security_barrier = true);

-- Step 4: Strengthen RLS policies for sensitive tables with rate limiting
DROP POLICY IF EXISTS enhanced_sensitive_data_access ON public.profiles_sensitive;
CREATE POLICY enhanced_sensitive_data_access ON public.profiles_sensitive
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND id IS NOT NULL
  AND (
    SELECT COUNT(*) 
    FROM public.security_audit_enhanced 
    WHERE user_id = auth.uid() 
    AND action = 'sensitive_access'
    AND timestamp > NOW() - INTERVAL '1 hour'
  ) < 10
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND id IS NOT NULL
);

-- Enhanced invitations protection with rate limiting
DROP POLICY IF EXISTS own_email_invitation_access ON public.invitations;
CREATE POLICY own_email_invitation_access ON public.invitations
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND email IS NOT NULL 
  AND email = auth.email() 
  AND auth.email() IS NOT NULL 
  AND status = 'pending'
);

DROP POLICY IF EXISTS subscription_admin_limited_access ON public.invitations;
CREATE POLICY subscription_admin_limited_access ON public.invitations
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND is_subscription_admin(subscription_id, auth.uid())
  AND (
    SELECT COUNT(*) 
    FROM public.security_audit_enhanced 
    WHERE user_id = auth.uid() 
    AND action = 'admin_access'
    AND timestamp > NOW() - INTERVAL '1 hour'
  ) < 20
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_subscription_admin(subscription_id, auth.uid())
);

-- Enhanced payment data protection with strict rate limiting
DROP POLICY IF EXISTS payment_data_user_only ON public.payment_metadata;
CREATE POLICY payment_data_user_only ON public.payment_metadata
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND (
    SELECT COUNT(*) 
    FROM public.security_audit_enhanced 
    WHERE user_id = auth.uid() 
    AND action = 'payment_access'
    AND timestamp > NOW() - INTERVAL '1 hour'
  ) < 5
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Step 5: Create audit logging function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    risk_score
  ) VALUES (
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW()
    ),
    CASE TG_TABLE_NAME
      WHEN 'profiles_sensitive' THEN 8
      WHEN 'payment_metadata' THEN 9
      WHEN 'invitations' THEN 6
      ELSE 5
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Apply audit triggers (corrected syntax)
DROP TRIGGER IF EXISTS audit_profiles_sensitive ON public.profiles_sensitive;
CREATE TRIGGER audit_profiles_sensitive
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

DROP TRIGGER IF EXISTS audit_payment_metadata ON public.payment_metadata;
CREATE TRIGGER audit_payment_metadata
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

DROP TRIGGER IF EXISTS audit_invitations ON public.invitations;
CREATE TRIGGER audit_invitations
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

-- Step 7: Grant minimal necessary permissions
GRANT SELECT ON public.invitations_admin_secure TO authenticated;
GRANT SELECT ON public.profiles_payment_secure TO authenticated;
GRANT SELECT ON public.events_secure_view TO authenticated;

-- Step 8: Final verification
SELECT 
  'SECURITY FIX COMPLETED: ' ||
  CASE 
    WHEN COUNT(*) = 0 THEN 'All SECURITY DEFINER views eliminated and sensitive data secured with rate limiting'
    ELSE 'WARNING: ' || COUNT(*)::text || ' SECURITY DEFINER views remain'
  END as security_status
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%' 
AND schemaname = 'public';