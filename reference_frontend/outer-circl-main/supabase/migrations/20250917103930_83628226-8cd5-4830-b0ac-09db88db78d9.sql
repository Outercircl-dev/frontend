-- Fix critical security issues identified in the security scan

-- 1. Fix Translation System RLS Policies - Make them require authentication
DROP POLICY IF EXISTS "Anyone can read translations" ON public.translations;
DROP POLICY IF EXISTS "Anyone can read translation keys" ON public.translation_keys;

-- Create secure policies for translations (authenticated users only)
CREATE POLICY "Authenticated users can read translations" ON public.translations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read translation keys" ON public.translation_keys  
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Fix Homepage Images RLS Policy - Make it require authentication
DROP POLICY IF EXISTS "Homepage images require authentication" ON public.homepage_images;

CREATE POLICY "Authenticated users can read homepage images" ON public.homepage_images
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Fix Function Search Path Issues - Add search_path to functions that don't have it
-- Update functions that are missing search_path parameter

-- Fix audit_profile_access function
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all profile access for security monitoring
  PERFORM public.log_security_event_secure(
    'profile_accessed',
    'profiles',
    auth.uid(),
    true,
    jsonb_build_object(
      'accessed_profile', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix audit_profile_changes function  
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log profile changes
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event_secure(
      'profile_updated',
      'profile',
      NEW.id,
      true,
      'Profile updated'
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event_secure(
      'profile_created',
      'profile',
      NEW.id,
      true,
      'Profile created'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;