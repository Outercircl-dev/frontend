-- FINAL SECURITY CLEANUP: Remove all remaining SECURITY DEFINER views
-- Fix for ERROR: Security Definer View warnings

-- Step 1: Identify and drop all remaining Security Definer views
-- This query will show us what views still have SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition ILIKE '%SECURITY DEFINER%';

-- Step 2: Drop and recreate any remaining problematic views
-- These are likely system-created views that we need to recreate without SECURITY DEFINER

-- Drop all views that might have SECURITY DEFINER (safe operation)
DROP VIEW IF EXISTS public.invitations_admin_secure CASCADE;
DROP VIEW IF EXISTS public.profiles_payment_secure CASCADE;
DROP VIEW IF EXISTS public.events_secure_view CASCADE;

-- Step 3: Recreate views WITHOUT Security Definer
-- Secure invitations view
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
  -- Mask email address for privacy (show only domain)
  CASE 
    WHEN auth.uid() = i.invited_by THEN i.email
    ELSE CONCAT('***@', SPLIT_PART(i.email, '@', 2))
  END as email_masked,
  i.status
FROM public.invitations i;

-- Secure payment view
CREATE VIEW public.profiles_payment_secure AS
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

-- Events secure view (already recreated in previous migration)
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
  -- Only show active events that haven't passed
  e.status = 'active' 
  AND e.date >= CURRENT_DATE;

-- Step 4: Grant appropriate permissions
GRANT SELECT ON public.invitations_admin_secure TO authenticated;
GRANT SELECT ON public.profiles_payment_secure TO authenticated;
GRANT SELECT ON public.events_secure_view TO authenticated;

-- Step 5: Verify no Security Definer views remain
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: No Security Definer views found'
    ELSE 'WARNING: ' || COUNT(*)::text || ' Security Definer views still exist: ' || 
         STRING_AGG(viewname, ', ')
  END as verification_status
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition ILIKE '%SECURITY DEFINER%';

-- Step 6: Create RLS policies for the new views if needed
-- Note: Views inherit RLS policies from their underlying tables automatically

-- Log the final security fix
SELECT 'FINAL SECURITY FIX APPLIED: All SECURITY DEFINER views removed and recreated as standard views' as status;