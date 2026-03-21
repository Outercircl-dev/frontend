-- Fix ambiguous event_id references by updating function and dependent policy
-- First drop the dependent policy
DROP POLICY IF EXISTS "Users can view events they can access" ON public.events;

-- Drop and recreate the function with proper parameter naming
DROP FUNCTION IF EXISTS public.user_can_view_event(uuid, uuid);

CREATE OR REPLACE FUNCTION public.user_can_view_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- User must be authenticated
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Rate limit event access checks to prevent scraping
  IF NOT public.check_profile_access_rate_limit(p_user_id, 'event_access', 50, 10) THEN
    -- Log suspicious activity
    PERFORM public.log_sensitive_access(
      p_user_id,
      'rate_limit_exceeded_event_access',
      'events',
      p_event_id,
      jsonb_build_object('timestamp', now(), 'action', 'potential_scraping_detected')
    );
    RETURN FALSE;
  END IF;
  
  -- Allow access only if user has legitimate relationship to event
  RETURN (
    -- User is the event host
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = p_event_id AND e.host_id = p_user_id
    ) OR
    -- User is a confirmed participant
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = p_event_id 
      AND ep.user_id = p_user_id 
      AND ep.status = 'attending'
    ) OR
    -- User is an invited participant (can see event details to decide)
    EXISTS (
      SELECT 1 FROM public.event_invitations ei
      WHERE ei.event_id = p_event_id 
      AND ei.invited_user_id = p_user_id 
      AND ei.status = 'pending'
    ) OR
    -- User has saved the event (legitimate interest)
    EXISTS (
      SELECT 1 FROM public.saved_events se
      WHERE se.event_id = p_event_id AND se.user_id = p_user_id
    )
  );
END;
$function$;

-- Recreate the policy with the updated function
CREATE POLICY "Users can view events they can access" ON public.events
FOR SELECT USING (
  (auth.uid() IS NOT NULL) AND 
  (user_can_view_event(id, auth.uid()) OR 
   ((status = 'active'::text) AND (date >= CURRENT_DATE) AND true))
);