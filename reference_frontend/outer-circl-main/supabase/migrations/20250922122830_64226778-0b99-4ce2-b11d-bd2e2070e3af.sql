-- Fix search path security issues in database functions

-- Update schedule_2h_reminder function with secure search path
CREATE OR REPLACE FUNCTION public.schedule_2h_reminder(p_event_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Insert reminder to be sent 2 hours before event
  INSERT INTO public.scheduled_reminders (event_id, reminder_type, scheduled_for)
  SELECT 
    p_event_id,
    '2h_reminder',
    (e.date + COALESCE(e.time, '12:00'::time)) - INTERVAL '2 hours'
  FROM public.events e
  WHERE e.id = p_event_id
    AND e.status = 'active'
    AND (e.date + COALESCE(e.time, '12:00'::time)) > now() + INTERVAL '2 hours'
  ON CONFLICT (event_id, reminder_type) DO NOTHING;
  
  RETURN FOUND;
END;
$function$;

-- Update process_scheduled_reminders function with secure search path  
CREATE OR REPLACE FUNCTION public.process_scheduled_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  reminder_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  -- Find reminders that should be sent now
  FOR reminder_record IN
    SELECT sr.id, sr.event_id, sr.reminder_type
    FROM public.scheduled_reminders sr
    WHERE sr.sent_at IS NULL
    AND sr.scheduled_for <= now()
  LOOP
    -- Call the appropriate edge function based on reminder type
    IF reminder_record.reminder_type = '2h_reminder' THEN
      PERFORM net.http_post(
        url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-2h-reminder',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
        body := json_build_object('eventId', reminder_record.event_id)::jsonb
      );
    END IF;
    
    -- Mark as sent
    UPDATE public.scheduled_reminders
    SET sent_at = now()
    WHERE id = reminder_record.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$function$;

-- Update log_simple_security_event function with secure search path
CREATE OR REPLACE FUNCTION public.log_simple_security_event(
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_success boolean DEFAULT true
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
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
    json_build_object('success', p_success)::jsonb,
    CASE WHEN p_success THEN 1 ELSE 5 END,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$function$;

-- Update log_sensitive_access_simple function with secure search path
CREATE OR REPLACE FUNCTION public.log_sensitive_access_simple(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    resource_id,
    action,
    resource_type,
    timestamp,
    metadata,
    risk_score,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_resource_id,
    p_operation,
    p_table_name,
    now(),
    json_build_object('operation', p_operation, 'table', p_table_name)::jsonb,
    8, -- High risk score for sensitive data access
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$function$;