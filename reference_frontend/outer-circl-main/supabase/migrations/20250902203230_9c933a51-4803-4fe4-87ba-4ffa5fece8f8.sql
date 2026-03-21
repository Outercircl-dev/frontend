-- Fix security warning: Function Search Path Mutable
-- Update remaining functions to have explicit search_path settings

-- Fix functions that don't have search_path explicitly set
CREATE OR REPLACE FUNCTION public.cleanup_unattended_saved_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Remove saved events for events that are completed and the user didn't attend
  WITH events_to_cleanup AS (
    SELECT se.id
    FROM public.saved_events se
    JOIN public.events e ON e.id = se.event_id
    LEFT JOIN public.event_participants ep ON ep.event_id = e.id AND ep.user_id = se.user_id
    WHERE e.status = 'completed'
    AND ep.id IS NULL -- User didn't participate
  )
  DELETE FROM public.saved_events
  WHERE id IN (SELECT id FROM events_to_cleanup);
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$function$;

-- Fix other functions that might not have explicit search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT 'admin' WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )),
    'user'
  );
$function$;

-- Ensure all trigger functions have proper search_path
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log access to sensitive data
  PERFORM public.log_sensitive_access_simple(
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;