-- FIX SECURITY LINTER ISSUES
-- Address function search path and other security warnings

-- Fix remaining functions that need proper search paths
CREATE OR REPLACE FUNCTION public.prevent_deactivated_account_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if account is deactivated
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.id AND account_status = 'deactivated'
  ) THEN
    RAISE EXCEPTION 'Account has been permanently deactivated and cannot be accessed';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_invite_users(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT membership_tier = 'premium'
  FROM public.profiles
  WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.check_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_status TEXT;
BEGIN
  -- Get the account status from profiles
  SELECT account_status INTO profile_status
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- If account is deactivated, prevent any operations
  IF profile_status = 'deactivated' THEN
    RAISE EXCEPTION 'This account has been permanently deactivated and cannot be accessed.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_activity_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant_record RECORD;
  status_message TEXT;
  event_title TEXT;
BEGIN
  -- Only notify when status changes to 'cancelled' or 'completed'
  IF OLD.status != NEW.status AND NEW.status IN ('cancelled', 'completed') THEN
    -- Get event title
    SELECT title INTO event_title FROM public.events WHERE id = NEW.id;
    
    -- Set appropriate message based on status
    IF NEW.status = 'cancelled' THEN
      status_message := 'The activity "' || event_title || '" has been cancelled';
    ELSIF NEW.status = 'completed' THEN
      status_message := 'The activity "' || event_title || '" has been completed';
    END IF;
    
    -- Notify all participants (excluding the host if they made the change)
    FOR participant_record IN 
      SELECT ep.user_id
      FROM public.event_participants ep
      WHERE ep.event_id = NEW.id 
      AND ep.status = 'attending'
    LOOP
      INSERT INTO public.notifications (
        user_id, 
        title, 
        content, 
        notification_type,
        metadata
      )
      VALUES (
        participant_record.user_id,
        'Activity Status Changed',
        status_message,
        'event',
        jsonb_build_object(
          'event_id', NEW.id,
          'event_title', event_title,
          'status_change', NEW.status,
          'action_required', false
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_recurring_activity_limits(p_user_id uuid, p_is_recurring boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_membership_tier text;
  current_recurring_count integer;
  monthly_limit integer;
BEGIN
  -- Get user's membership tier
  SELECT membership_tier INTO user_membership_tier
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If not creating a recurring event, always allow
  IF NOT p_is_recurring THEN
    RETURN true;
  END IF;
  
  -- Set limits based on membership tier
  IF user_membership_tier = 'premium' THEN
    monthly_limit := 999999; -- Unlimited for premium
  ELSE
    monthly_limit := 2; -- Standard users limited to 2 per month
  END IF;
  
  -- Count recurring events created this month by this user
  SELECT COUNT(*) INTO current_recurring_count
  FROM public.events
  WHERE host_id = p_user_id
    AND is_recurring = true
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';
  
  -- Check if user can create more recurring events
  RETURN current_recurring_count < monthly_limit;
END;
$$;

-- Update the remaining critical functions with proper search paths
CREATE OR REPLACE FUNCTION public.track_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Status check
SELECT 'FUNCTION SECURITY FIXES COMPLETED' as status;