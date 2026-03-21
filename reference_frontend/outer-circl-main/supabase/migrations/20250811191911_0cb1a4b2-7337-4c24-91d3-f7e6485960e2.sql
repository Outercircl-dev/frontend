-- Comprehensive Security Fix: Resolve all identified security issues
-- Fix 1: Secure the user_activity_summary_secure table to prevent email exposure

-- Add RLS policies to the user_activity_summary_secure table if not already present
ALTER TABLE public.user_activity_summary_secure ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be too permissive
DROP POLICY IF EXISTS "Users can only view their own activity summary" ON public.user_activity_summary_secure;

-- Create strict RLS policy for user_activity_summary_secure
CREATE POLICY "strict_user_activity_summary_access"
ON public.user_activity_summary_secure
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Remove email field from user_activity_summary_secure as it's not needed for functionality
-- This eliminates the email exposure risk entirely
ALTER TABLE public.user_activity_summary_secure DROP COLUMN IF EXISTS user_email;

-- Fix 2: Move extensions from public schema to extensions schema
-- Check what extensions exist in public schema and move them
DO $$
DECLARE
    ext_name text;
BEGIN
    -- Move common extensions that might be in public schema
    FOR ext_name IN 
        SELECT extname FROM pg_extension e 
        JOIN pg_namespace n ON e.extnamespace = n.oid 
        WHERE n.nspname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_name);
        EXCEPTION 
            WHEN insufficient_privilege THEN
                -- Skip extensions we can't move (system managed)
                CONTINUE;
            WHEN undefined_object THEN
                -- Extensions schema doesn't exist, create it
                CREATE SCHEMA IF NOT EXISTS extensions;
                EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_name);
            WHEN OTHERS THEN
                -- Log and continue with other extensions
                RAISE NOTICE 'Could not move extension %: %', ext_name, SQLERRM;
                CONTINUE;
        END;
    END LOOP;
END $$;

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Fix 3: Additional security hardening for profiles_public_secure
-- Ensure the table is properly secured and doesn't expose sensitive data

-- Add a check to ensure no sensitive fields are accidentally added
CREATE OR REPLACE FUNCTION public.validate_profiles_public_secure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Prevent insertion of records that might contain sensitive data patterns
    IF NEW.bio IS NOT NULL AND (
        NEW.bio ILIKE '%email:%' OR 
        NEW.bio ILIKE '%phone:%' OR 
        NEW.bio ILIKE '%@%@%' OR
        length(NEW.bio) > 500
    ) THEN
        NEW.bio := left(regexp_replace(NEW.bio, '(\w+@\w+\.\w+)', '[email]', 'gi'), 500);
    END IF;
    
    -- Sanitize name field to prevent data leakage
    IF NEW.name IS NOT NULL AND length(NEW.name) > 100 THEN
        NEW.name := left(NEW.name, 100);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add trigger to validate data in profiles_public_secure
DROP TRIGGER IF EXISTS validate_profiles_public_secure_trigger ON public.profiles_public_secure;
CREATE TRIGGER validate_profiles_public_secure_trigger
    BEFORE INSERT OR UPDATE ON public.profiles_public_secure
    FOR EACH ROW EXECUTE FUNCTION public.validate_profiles_public_secure();

-- Fix 4: Add additional rate limiting for security
-- Enhance the existing rate limiting function with stricter limits for sensitive operations

CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(p_user_id UUID, p_action TEXT DEFAULT 'profile_view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    max_requests INTEGER;
    window_minutes INTEGER;
BEGIN
    -- Set stricter limits for profile-related operations
    CASE p_action
        WHEN 'profile_view' THEN
            max_requests := 100;
            window_minutes := 60;
        WHEN 'profile_search' THEN
            max_requests := 50;
            window_minutes := 60;
        WHEN 'profile_update' THEN
            max_requests := 10;
            window_minutes := 60;
        ELSE
            max_requests := 30;
            window_minutes := 60;
    END CASE;
    
    RETURN public.check_rate_limit(
        p_user_id, 
        NULL, -- No IP-based limiting for authenticated users
        p_action,
        max_requests,
        window_minutes
    );
END;
$$;

-- Create a function to audit sensitive data access
CREATE OR REPLACE FUNCTION public.audit_profile_access(p_profile_id UUID, p_accessor_id UUID, p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log profile access for security monitoring
    PERFORM public.log_security_event(
        p_action,
        'profile_access',
        p_accessor_id,
        TRUE,
        jsonb_build_object(
            'accessed_profile_id', p_profile_id,
            'access_time', now(),
            'action', p_action
        )::text
    );
END;
$$;

-- Grant necessary permissions for security functions
GRANT EXECUTE ON FUNCTION public.check_profile_access_rate_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_profile_access(UUID, UUID, TEXT) TO authenticated;