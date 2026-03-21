-- COMPREHENSIVE SECURITY DEFINER VIEWS CLEANUP
-- This will find and fix ALL Security Definer views in the database

-- Step 1: Query to identify ALL views with SECURITY DEFINER in any schema
DO $$
DECLARE
    view_record RECORD;
    clean_definition TEXT;
BEGIN
    -- Loop through all views that contain SECURITY DEFINER
    FOR view_record IN 
        SELECT schemaname, viewname, definition
        FROM pg_views 
        WHERE definition ILIKE '%SECURITY DEFINER%'
    LOOP
        RAISE NOTICE 'Found SECURITY DEFINER view: %.%', view_record.schemaname, view_record.viewname;
        
        -- For public schema views, recreate them without SECURITY DEFINER
        IF view_record.schemaname = 'public' THEN
            -- Drop the view
            EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
            
            -- Clean the definition by removing SECURITY DEFINER
            clean_definition := regexp_replace(
                view_record.definition, 
                '\s*WITH\s*\(\s*security_definer\s*=\s*true\s*\)', 
                '', 
                'gi'
            );
            clean_definition := regexp_replace(
                clean_definition, 
                '\s*WITH\s*\(\s*security_definer\s*\)', 
                '', 
                'gi'
            );
            clean_definition := regexp_replace(
                clean_definition, 
                'SECURITY\s+DEFINER', 
                '', 
                'gi'
            );
            
            -- Recreate the view without SECURITY DEFINER
            EXECUTE clean_definition;
            
            -- Grant appropriate permissions
            EXECUTE format('GRANT SELECT ON %I.%I TO authenticated', view_record.schemaname, view_record.viewname);
            
            RAISE NOTICE 'Recreated view %.% without SECURITY DEFINER', view_record.schemaname, view_record.viewname;
        END IF;
    END LOOP;
END
$$;

-- Step 2: Manual cleanup of known problematic views that might still exist

-- Drop and recreate invitations_admin_secure without any SECURITY DEFINER
DROP VIEW IF EXISTS public.invitations_admin_secure CASCADE;
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
  -- Mask email address for privacy
  CASE 
    WHEN auth.uid() = i.invited_by THEN i.email
    ELSE CONCAT('***@', SPLIT_PART(i.email, '@', 2))
  END as email_masked,
  i.status
FROM public.invitations i;

-- Drop and recreate profiles_payment_secure
DROP VIEW IF EXISTS public.profiles_payment_secure CASCADE;
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

-- Drop and recreate events_secure_view 
DROP VIEW IF EXISTS public.events_secure_view CASCADE;
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

-- Grant permissions
GRANT SELECT ON public.invitations_admin_secure TO authenticated;
GRANT SELECT ON public.profiles_payment_secure TO authenticated;
GRANT SELECT ON public.events_secure_view TO authenticated;

-- Step 3: Final verification
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All SECURITY DEFINER views have been removed'
    ELSE 'ERROR: ' || COUNT(*)::text || ' SECURITY DEFINER views still exist: ' || 
         STRING_AGG(schemaname || '.' || viewname, ', ')
  END as final_verification
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%';

-- Log completion
SELECT 'COMPREHENSIVE SECURITY DEFINER CLEANUP COMPLETED' as status;