-- Fix 1: Security Definer View - Recreate invitations_safe with SECURITY INVOKER
DROP VIEW IF EXISTS public.invitations_safe;

CREATE VIEW public.invitations_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  subscription_id,
  slot_id,
  invited_by,
  mask_email(email) AS email_masked,
  email_hash,
  status,
  invitation_token,
  expires_at,
  created_at,
  updated_at
FROM public.invitations;

-- Fix 2: Meetup Spot Protection - Create helper function
CREATE OR REPLACE FUNCTION public.can_view_meetup_spot(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- User must be authenticated
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is host or attending participant
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
    )
  );
END;
$$;

-- Create a secure view for events that conditionally exposes meetup_spot
CREATE OR REPLACE VIEW public.events_public_view
WITH (security_invoker = true) AS
SELECT 
  id,
  title,
  description,
  date,
  time,
  location,
  -- Only show meetup_spot if user has permission
  CASE 
    WHEN can_view_meetup_spot(id, auth.uid()) THEN meetup_spot
    ELSE NULL
  END AS meetup_spot,
  image_url,
  category,
  host_id,
  max_attendees,
  status,
  gender_preference,
  duration,
  is_recurring,
  recurring_type,
  recurrence_pattern,
  recurrence_interval,
  recurrence_end_date,
  recurrence_end_count,
  parent_event_id,
  occurrence_number,
  coordinates,
  created_at,
  updated_at,
  completed_at
FROM public.events;

COMMENT ON VIEW public.events_public_view IS 'Secure view that conditionally exposes meetup_spot only to hosts and confirmed attendees';
COMMENT ON FUNCTION public.can_view_meetup_spot(uuid, uuid) IS 'Security definer function to check if user can view event meetup spot';