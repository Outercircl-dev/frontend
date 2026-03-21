-- Fix critical security issues by updating functions with proper search_path
-- This prevents SQL injection vulnerabilities

-- Drop and recreate functions that need search_path fixes
DROP FUNCTION IF EXISTS public.is_friends_with(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_event_host(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_event_participant(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_subscription_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_subscription_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.wants_email_notifications(uuid);

-- Recreate with proper security settings
CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1_id AND f.friend_id = user2_id) OR
           (f.user_id = user2_id AND f.friend_id = user1_id))
    AND f.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_host(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.host_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_user_id 
    AND ep.status = 'attending'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_admin(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = p_subscription_id 
    AND ms.admin_user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_member(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = p_subscription_id 
    AND ms.user_id = p_user_id
    AND ms.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.wants_email_notifications(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(pps.email_notifications, true)
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = p_user_id;
$$;