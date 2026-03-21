-- Security Enhancement: Fix Database Functions Search Path and Enhance Security
-- This addresses the "Function Search Path Mutable" security warnings

-- Drop existing functions that need to be recreated with proper signatures
DROP FUNCTION IF EXISTS public.log_security_event_secure(text,text,uuid,boolean,text);

-- Fix add_host_as_participant function
CREATE OR REPLACE FUNCTION public.add_host_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert the host as an attending participant
  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (NEW.id, NEW.host_id, 'attending');
  
  RETURN NEW;
END;
$function$;

-- Fix allows_ad_personalization function
CREATE OR REPLACE FUNCTION public.allows_ad_personalization()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT ad_personalization 
     FROM public.profile_privacy_settings 
     WHERE user_id = auth.uid()), 
    true
  );
END;
$function$;

-- Fix can_show_recommendations function
CREATE OR REPLACE FUNCTION public.can_show_recommendations()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT personalization_opt != 'minimal' 
     FROM public.profile_privacy_settings 
     WHERE user_id = auth.uid()), 
    true
  );
END;
$function$;

-- Fix can_view_event_details function
CREATE OR REPLACE FUNCTION public.can_view_event_details(event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has legitimate access to event
  RETURN (
    -- User is the event host
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.host_id = auth.uid()
    ) OR
    -- User is a participant
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = event_id 
      AND ep.user_id = auth.uid() 
      AND ep.status = 'attending'
    ) OR
    -- User has saved the event
    EXISTS (
      SELECT 1 FROM public.saved_events se
      WHERE se.event_id = event_id AND se.user_id = auth.uid()
    ) OR
    -- Event is active and public
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id 
      AND e.status = 'active' 
      AND e.date >= CURRENT_DATE
    )
  );
END;
$function$;

-- Enhanced security logging function for critical operations
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_user_id uuid,
  p_success boolean,
  p_metadata text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into enhanced audit log with high security
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    timestamp,
    metadata,
    risk_score,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    now(),
    COALESCE(p_metadata::jsonb, '{}'::jsonb),
    CASE 
      WHEN p_resource_type IN ('payment_metadata', 'profiles_sensitive') THEN 9
      WHEN p_resource_type = 'invitations' THEN 7
      ELSE 5
    END,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Ensure security logging failures don't break application
    RAISE WARNING 'Security audit logging failed: %', SQLERRM;
END;
$function$;