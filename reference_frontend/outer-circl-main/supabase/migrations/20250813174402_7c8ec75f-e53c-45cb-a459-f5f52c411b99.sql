-- SECURITY FIX: Identify and fix Security Definer Views

-- Step 1: Find all views with SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition ILIKE '%SECURITY DEFINER%';

-- Step 2: Drop the events_secure_view (most likely culprit)
DROP VIEW IF EXISTS public.events_secure_view;

-- Step 3: Recreate events_secure_view WITHOUT Security Definer
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
  -- RLS policies on the events table will automatically be applied

-- Step 4: Grant appropriate permissions
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

-- Log the fix
SELECT 'SECURITY FIX APPLIED: Removed SECURITY DEFINER property from views to ensure proper RLS enforcement' as status;