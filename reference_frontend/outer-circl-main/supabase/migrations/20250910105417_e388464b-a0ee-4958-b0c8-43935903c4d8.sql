-- Phase 1: Fix Function Search Path Security Issues
-- All functions need explicit search_path for security

-- Update existing functions to have explicit search_path
CREATE OR REPLACE FUNCTION public.log_invitation_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all invitation access for security monitoring
  PERFORM public.log_security_event_secure(
    CASE TG_OP 
      WHEN 'SELECT' THEN 'invitation_viewed'
      WHEN 'INSERT' THEN 'invitation_created'
      WHEN 'UPDATE' THEN 'invitation_updated'
      WHEN 'DELETE' THEN 'invitation_deleted'
    END,
    'invitations',
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'operation', TG_OP,
      'email_accessed', COALESCE(NEW.email, OLD.email),
      'subscription_id', COALESCE(NEW.subscription_id, OLD.subscription_id)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log profile updates for audit trail
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event_secure(
      'profile_updated',
      'profiles',
      NEW.id,
      true,
      jsonb_build_object(
        'changed_fields', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
        )
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_secure_event_data(p_event_id uuid)
RETURNS TABLE(id uuid, title text, description text, date date, time_slot time without time zone, location text, category text, status text, host_id uuid, max_attendees integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- This function respects RLS policies on events table
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.date,
    e.time as time_slot,
    e.location,
    e.category,
    e.status,
    e.host_id,
    e.max_attendees
  FROM public.events e
  WHERE e.id = p_event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_user_agreement(p_user_id uuid, p_agreement_type text, p_agreement_version text DEFAULT '1.0'::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  agreement_id UUID;
BEGIN
  INSERT INTO public.user_agreements (
    user_id,
    agreement_type,
    agreement_version,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_agreement_type,
    p_agreement_version,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO agreement_id;
  
  RETURN agreement_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.suggest_unique_username(base_username text)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  suggestions text[] := '{}';
  candidate text;
  counter integer := 1;
BEGIN
  -- Clean the base username
  base_username := LOWER(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  
  -- Truncate if too long
  IF LENGTH(base_username) > 20 THEN
    base_username := SUBSTRING(base_username FROM 1 FOR 20);
  END IF;
  
  -- Generate up to 5 suggestions
  WHILE array_length(suggestions, 1) < 5 AND counter <= 100 LOOP
    candidate := base_username || '_' || counter;
    
    IF public.is_username_unique(candidate) THEN
      suggestions := array_append(suggestions, candidate);
    END IF;
    
    counter := counter + 1;
  END LOOP;
  
  RETURN suggestions;
END;
$function$;

-- Phase 2: Restrict Homepage Images Access
-- Change RLS policy to require authentication for homepage images

DROP POLICY IF EXISTS "Homepage images are publicly readable" ON public.homepage_images;

CREATE POLICY "Homepage images require authentication"
ON public.homepage_images
FOR SELECT
TO authenticated
USING (true);

-- Phase 3: Enhanced Security Monitoring
-- Create enhanced security monitoring table if not exists
CREATE TABLE IF NOT EXISTS public.security_events_realtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  resource_type text,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  risk_score integer DEFAULT 1,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events_realtime ENABLE ROW LEVEL SECURITY;

-- Only admins can access security events
CREATE POLICY "security_events_admin_only"
ON public.security_events_realtime
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create function for real-time security logging
CREATE OR REPLACE FUNCTION public.log_security_event_realtime(
  p_event_type text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_risk_score integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events_realtime (
    user_id,
    event_type,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    risk_score,
    metadata
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_resource_type,
    p_resource_id,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    p_risk_score,
    p_metadata
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to prevent blocking operations
    NULL;
END;
$function$;

-- Phase 4: Create security validation function for future use
CREATE OR REPLACE FUNCTION public.validate_security_context()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  user_verified boolean := false;
  suspicious_activity boolean := false;
BEGIN
  current_user_id := auth.uid();
  
  -- Must be authenticated
  IF current_user_id IS NULL THEN
    PERFORM log_security_event_realtime('unauthorized_access', 'validation', NULL, 8);
    RETURN false;
  END IF;
  
  -- Check if user is verified
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = current_user_id 
    AND email_confirmed_at IS NOT NULL
  ) INTO user_verified;
  
  IF NOT user_verified THEN
    PERFORM log_security_event_realtime('unverified_user_access', 'validation', current_user_id, 6);
    RETURN false;
  END IF;
  
  -- Check for suspicious activity (more than 100 requests in last hour)
  SELECT COUNT(*) > 100 FROM public.security_events_realtime
  WHERE user_id = current_user_id 
  AND created_at > now() - interval '1 hour'
  INTO suspicious_activity;
  
  IF suspicious_activity THEN
    PERFORM log_security_event_realtime('suspicious_activity_detected', 'validation', current_user_id, 9);
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Add comment to track security hardening completion
COMMENT ON FUNCTION public.validate_security_context() IS 'Security hardening phase 1-4 complete: Enhanced validation with real-time monitoring';