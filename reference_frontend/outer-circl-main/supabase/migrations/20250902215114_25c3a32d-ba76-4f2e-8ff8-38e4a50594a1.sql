-- Fix all remaining references to old log_sensitive_access function
-- Update functions that don't have dependencies, then handle user_can_view_event specially

-- Drop functions that don't have policy dependencies
DROP FUNCTION IF EXISTS public.check_profile_access_rate_limit(uuid, text);
DROP FUNCTION IF EXISTS public.check_sensitive_data_permission(uuid, text);
DROP FUNCTION IF EXISTS public.discover_events_secure(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_user_invitations(text);
DROP FUNCTION IF EXISTS public.get_admin_invitations(uuid);
DROP FUNCTION IF EXISTS public.audit_sensitive_data_access();
DROP FUNCTION IF EXISTS public.check_suspicious_access_patterns(uuid);
DROP FUNCTION IF EXISTS public.audit_sensitive_access();
DROP FUNCTION IF EXISTS public.check_sensitive_data_permission_enhanced(uuid, text);

-- Update user_can_view_event function in place without dropping
CREATE OR REPLACE FUNCTION public.user_can_view_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  is_host boolean := false;
  is_participant boolean := false;
  event_status text;
BEGIN
  -- Check if event exists and get status
  SELECT status INTO event_status
  FROM public.events
  WHERE id = p_event_id;
  
  IF event_status IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is the event host
  SELECT EXISTS(
    SELECT 1 FROM public.events 
    WHERE id = p_event_id AND host_id = p_user_id
  ) INTO is_host;
  
  -- Check if user is a participant
  SELECT EXISTS(
    SELECT 1 FROM public.event_participants 
    WHERE event_id = p_event_id AND user_id = p_user_id AND status = 'attending'
  ) INTO is_participant;
  
  -- Log the access attempt (using the new simplified function)
  PERFORM public.log_sensitive_access_simple(
    p_user_id,
    'view_event',
    'events',
    p_event_id
  );
  
  -- Allow access if user is host, participant, or event is active and public
  RETURN is_host OR is_participant OR (event_status = 'active');
END;
$function$;

-- Recreate the other functions
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(p_user_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  access_count integer;
  rate_limit_exceeded boolean := false;
BEGIN
  -- Count recent access attempts (last hour)
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND action = p_action
    AND timestamp > now() - INTERVAL '1 hour';
  
  -- Check if rate limit exceeded (more than 10 per hour)
  IF access_count > 10 THEN
    rate_limit_exceeded := true;
  END IF;
  
  -- Log the rate limit check
  PERFORM public.log_sensitive_access_simple(
    p_user_id,
    'rate_limit_check',
    'profile_access',
    p_user_id
  );
  
  RETURN NOT rate_limit_exceeded;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_sensitive_data_permission(p_user_id uuid, p_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Basic permission check - user can only access their own data
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Log the permission check
  PERFORM public.log_sensitive_access_simple(
    p_user_id,
    'permission_check',
    p_table_name,
    p_user_id
  );
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.discover_events_secure(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  title text,
  description text, 
  date date,
  "time" time,
  location text,
  category text,
  host_id uuid,
  max_attendees integer,
  current_attendees bigint,
  image_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log the discovery request
  PERFORM public.log_sensitive_access_simple(
    p_user_id,
    'discover_events',
    'events',
    NULL
  );
  
  -- Return active events that the user can view
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.date,
    e.time,
    e.location,
    e.category,
    e.host_id,
    e.max_attendees,
    COALESCE(participant_counts.count, 0) as current_attendees,
    e.image_url
  FROM public.events e
  LEFT JOIN (
    SELECT event_id, COUNT(*) as count
    FROM public.event_participants
    WHERE status = 'attending'
    GROUP BY event_id
  ) participant_counts ON e.id = participant_counts.event_id
  WHERE e.status = 'active'
    AND e.date >= CURRENT_DATE
    AND public.user_can_view_event(e.id, p_user_id)
  ORDER BY e.date ASC, e.time ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_invitations(p_user_email text)
RETURNS TABLE(
  id uuid,
  subscription_id uuid,
  slot_id uuid,
  invited_by uuid,
  invitation_token uuid,
  expires_at timestamp with time zone,
  email text,
  status text,
  subscription_tier text,
  inviter_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log the invitation access
  PERFORM public.log_sensitive_access_simple(
    auth.uid(),
    'get_invitations',
    'invitations',
    NULL
  );
  
  RETURN QUERY
  SELECT 
    i.id,
    i.subscription_id,
    i.slot_id,
    i.invited_by,
    i.invitation_token,
    i.expires_at,
    i.email,
    i.status,
    ms.subscription_tier,
    p.name as inviter_name
  FROM public.invitations i
  JOIN public.membership_subscriptions ms ON ms.id = i.subscription_id
  JOIN public.profiles p ON p.id = i.invited_by
  WHERE LOWER(i.email) = LOWER(p_user_email)
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_invitations(p_admin_id uuid)
RETURNS TABLE(
  id uuid,
  subscription_id uuid,
  slot_id uuid,
  invited_by uuid,
  invitation_token uuid,
  expires_at timestamp with time zone,
  email text,
  status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log the admin invitation access
  PERFORM public.log_sensitive_access_simple(
    p_admin_id,
    'get_admin_invitations',
    'invitations',
    NULL
  );
  
  RETURN QUERY
  SELECT 
    i.id,
    i.subscription_id,
    i.slot_id,
    i.invited_by,
    i.invitation_token,
    i.expires_at,
    i.email,
    i.status,
    i.created_at
  FROM public.invitations i
  WHERE i.invited_by = p_admin_id
  ORDER BY i.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.check_suspicious_access_patterns(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  access_count integer;
  suspicious_pattern boolean := false;
BEGIN
  -- Count recent access attempts (last 10 minutes)
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_enhanced
  WHERE user_id = p_user_id
    AND timestamp > now() - INTERVAL '10 minutes';
  
  -- Check for suspicious patterns (more than 20 accesses in 10 minutes)
  IF access_count > 20 THEN
    suspicious_pattern := true;
  END IF;
  
  -- Log the suspicious pattern check
  PERFORM public.log_sensitive_access_simple(
    p_user_id,
    'suspicious_check',
    'security_audit',
    p_user_id
  );
  
  RETURN suspicious_pattern;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log the sensitive access
  PERFORM public.log_sensitive_access_simple(
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_sensitive_data_permission_enhanced(p_user_id uuid, p_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  has_permission boolean := false;
  rate_limit_ok boolean := false;
BEGIN
  -- Basic permission check - user can only access their own data
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Check rate limiting
  SELECT public.check_profile_access_rate_limit(p_user_id, 'sensitive_data_access') INTO rate_limit_ok;
  
  IF NOT rate_limit_ok THEN
    RETURN false;
  END IF;
  
  -- Check for suspicious access patterns
  IF public.check_suspicious_access_patterns(p_user_id) THEN
    RETURN false;
  END IF;
  
  has_permission := true;
  
  -- Log the enhanced permission check
  PERFORM public.log_sensitive_access_simple(
    p_user_id,
    'enhanced_permission_check',
    p_table_name,
    p_user_id
  );
  
  RETURN has_permission;
END;
$function$;