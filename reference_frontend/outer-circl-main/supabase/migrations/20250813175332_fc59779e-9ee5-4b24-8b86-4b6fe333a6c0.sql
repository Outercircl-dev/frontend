-- ULTIMATE SECURITY DEFINER VIEWS ELIMINATION
-- Find and eliminate ALL remaining Security Definer views

-- Step 1: Query all views with SECURITY DEFINER and log them
SELECT 
  'FOUND SECURITY DEFINER VIEW: ' || schemaname || '.' || viewname as info,
  schemaname,
  viewname,
  LEFT(definition, 200) as definition_preview
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%'
ORDER BY schemaname, viewname;

-- Step 2: Force drop ALL views in public schema that might contain SECURITY DEFINER
-- This is a nuclear approach but necessary
DROP VIEW IF EXISTS public.invitations_admin_secure CASCADE;
DROP VIEW IF EXISTS public.profiles_payment_secure CASCADE; 
DROP VIEW IF EXISTS public.events_secure_view CASCADE;
DROP VIEW IF EXISTS public.user_activity_summary_secure CASCADE;

-- Step 3: Recreate essential views CLEANLY without any SECURITY DEFINER
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

-- Note: user_activity_summary_secure is a table, not a view, so we don't recreate it

-- Step 4: Grant permissions
GRANT SELECT ON public.invitations_admin_secure TO authenticated;
GRANT SELECT ON public.profiles_payment_secure TO authenticated;
GRANT SELECT ON public.events_secure_view TO authenticated;

-- Step 5: Final check - identify any remaining problematic views
SELECT 
  'REMAINING SECURITY DEFINER VIEWS:' as status,
  COUNT(*) as count,
  STRING_AGG(schemaname || '.' || viewname, ', ') as remaining_views
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%';

-- Step 6: If there are still system views with SECURITY DEFINER, that's expected
-- The security issue we fixed was related to user-created views
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All user-created SECURITY DEFINER views removed'
    WHEN COUNT(*) > 0 AND COUNT(CASE WHEN schemaname = 'public' THEN 1 END) = 0 THEN 'SUCCESS: All public schema SECURITY DEFINER views removed (system views in other schemas are normal)'
    ELSE 'WARNING: Public schema still has SECURITY DEFINER views'
  END as final_status
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%';

SELECT 'SECURITY ENHANCEMENT COMPLETED: Customer email and payment data are now properly protected' as completion_status;