-- Create event invitations table
CREATE TABLE public.event_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event invitations
CREATE POLICY "Users can view invitations they sent or received"
ON public.event_invitations
FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invited_user_id);

CREATE POLICY "Premium users can invite others to their events"
ON public.event_invitations
FOR INSERT
WITH CHECK (
  auth.uid() = inviter_id AND
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.profiles p ON p.id = e.host_id
    WHERE e.id = event_invitations.event_id 
    AND e.host_id = auth.uid()
    AND p.membership_tier = 'premium'
  )
);

CREATE POLICY "Users can respond to their invitations"
ON public.event_invitations
FOR UPDATE
USING (auth.uid() = invited_user_id);

CREATE POLICY "Event hosts can manage invitations for their events"
ON public.event_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_invitations.event_id
    AND events.host_id = auth.uid()
  )
);

-- Function to check if user can invite others (premium only)
CREATE OR REPLACE FUNCTION public.can_invite_users(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT membership_tier = 'premium'
  FROM public.profiles
  WHERE id = p_user_id;
$$;

-- Function to get user's friends for invitation
CREATE OR REPLACE FUNCTION public.get_user_friends(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT DISTINCT
    p.id,
    p.name,
    p.username,
    p.avatar_url
  FROM public.profiles p
  JOIN public.friendships f ON (
    (f.user_id = p.id AND f.friend_id = p_user_id) OR
    (f.friend_id = p.id AND f.user_id = p_user_id)
  )
  WHERE f.status = 'accepted'
  AND p.account_status = 'active'
  AND p.id != p_user_id
  ORDER BY p.name;
$$;

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION public.accept_event_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.event_invitations
  WHERE id = p_invitation_id
  AND invited_user_id = auth.uid()
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update invitation status
  UPDATE public.event_invitations
  SET status = 'accepted', responded_at = now(), updated_at = now()
  WHERE id = p_invitation_id;
  
  -- Add user as participant
  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (invitation_record.event_id, invitation_record.invited_user_id, 'attending')
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET status = 'attending', updated_at = now();
  
  -- Send notification to event host
  INSERT INTO public.notifications (
    user_id,
    title,
    content,
    notification_type,
    metadata
  )
  SELECT 
    e.host_id,
    'Invitation Accepted',
    COALESCE(p.name, p.username) || ' accepted your invitation to "' || e.title || '"',
    'event',
    jsonb_build_object(
      'event_id', e.id,
      'event_title', e.title,
      'accepted_by', invitation_record.invited_user_id
    )
  FROM public.events e
  JOIN public.profiles p ON p.id = invitation_record.invited_user_id
  WHERE e.id = invitation_record.event_id;
  
  RETURN TRUE;
END;
$$;

-- Function to leave an event
CREATE OR REPLACE FUNCTION public.leave_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  event_title TEXT;
  host_id UUID;
BEGIN
  -- Get event details
  SELECT title, host_id INTO event_title, host_id
  FROM public.events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Don't allow host to leave their own event
  IF host_id = auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  -- Remove user from participants
  DELETE FROM public.event_participants
  WHERE event_id = p_event_id AND user_id = auth.uid();
  
  -- Update any pending invitations to declined
  UPDATE public.event_invitations
  SET status = 'declined', responded_at = now(), updated_at = now()
  WHERE event_id = p_event_id 
  AND invited_user_id = auth.uid() 
  AND status = 'pending';
  
  -- Notify host if user was participating
  IF FOUND THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      content,
      notification_type,
      metadata
    )
    SELECT 
      host_id,
      'User Left Activity',
      COALESCE(p.name, p.username) || ' left "' || event_title || '"',
      'event',
      jsonb_build_object(
        'event_id', p_event_id,
        'event_title', event_title,
        'left_by', auth.uid()
      )
    FROM public.profiles p
    WHERE p.id = auth.uid();
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Trigger to send invitation notifications
CREATE OR REPLACE FUNCTION public.notify_event_invitation()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  inviter_name TEXT;
  event_title TEXT;
BEGIN
  -- Only process new invitations
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Get inviter name and event title
    SELECT 
      p.name,
      e.title
    INTO inviter_name, event_title
    FROM public.profiles p
    JOIN public.events e ON e.id = NEW.event_id
    WHERE p.id = NEW.inviter_id;
    
    -- Send notification to invited user
    INSERT INTO public.notifications (
      user_id,
      title,
      content,
      notification_type,
      metadata
    )
    VALUES (
      NEW.invited_user_id,
      'Activity Invitation',
      COALESCE(inviter_name, 'Someone') || ' invited you to "' || event_title || '"',
      'event',
      jsonb_build_object(
        'invitation_id', NEW.id,
        'event_id', NEW.event_id,
        'event_title', event_title,
        'inviter_id', NEW.inviter_id,
        'action_required', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for invitation notifications
CREATE TRIGGER trigger_notify_event_invitation
AFTER INSERT ON public.event_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_invitation();

-- Add updated_at trigger for event_invitations
CREATE TRIGGER update_event_invitations_updated_at
BEFORE UPDATE ON public.event_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();