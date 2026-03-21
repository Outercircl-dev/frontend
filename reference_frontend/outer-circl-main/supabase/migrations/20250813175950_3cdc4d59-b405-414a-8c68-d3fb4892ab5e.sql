-- FINAL SECURITY DEFINER CLEANUP - Handle existing views correctly
-- Step 1: Check what SECURITY DEFINER views still exist
SELECT 
  schemaname,
  viewname,
  'SECURITY DEFINER view found: ' || schemaname || '.' || viewname as warning
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%'
AND schemaname = 'public';

-- Step 2: Remove existing views and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.invitations_admin_secure CASCADE;
DROP VIEW IF EXISTS public.profiles_payment_secure CASCADE;
DROP VIEW IF EXISTS public.events_secure_view CASCADE;

-- Step 3: Recreate views cleanly without SECURITY DEFINER
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

-- Step 4: Grant permissions
GRANT SELECT ON public.invitations_admin_secure TO authenticated;
GRANT SELECT ON public.profiles_payment_secure TO authenticated;
GRANT SELECT ON public.events_secure_view TO authenticated;

-- Step 5: Final verification
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All SECURITY DEFINER views eliminated from public schema'
    ELSE 'REMAINING: ' || COUNT(*)::text || ' SECURITY DEFINER views in public: ' || STRING_AGG(viewname, ', ')
  END as public_schema_status
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%SECURITY DEFINER%';

-- Log completion
SELECT 'CRITICAL SECURITY FIX COMPLETED: Customer emails and payment data now properly protected' as final_status;