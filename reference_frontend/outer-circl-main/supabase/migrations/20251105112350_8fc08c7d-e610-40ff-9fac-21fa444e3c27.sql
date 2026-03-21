-- Fix SECURITY DEFINER functions missing search_path
-- This prevents privilege escalation attacks by ensuring functions only access public schema

-- Fix is_subscription_admin function
CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots
    WHERE subscription_id = is_subscription_admin.subscription_id 
    AND user_id = is_subscription_admin.user_id 
    AND role = 'admin'
  );
END;
$$;

-- Fix is_subscription_member function  
CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots
    WHERE subscription_id = is_subscription_member.subscription_id 
    AND user_id = is_subscription_member.user_id 
    AND status = 'active'
  );
END;
$$;

-- Fix initialize_user_preferences function
CREATE OR REPLACE FUNCTION public.initialize_user_preferences(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (
    user_id,
    language,
    theme,
    notifications_enabled,
    email_notifications,
    push_notifications,
    sms_notifications,
    reminder_timing,
    timezone
  ) VALUES (
    p_user_id,
    'en',
    'light',
    true,
    true,
    true,
    false,
    '2h',
    'UTC'
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Fix sync_user_preferences function
CREATE OR REPLACE FUNCTION public.sync_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM initialize_user_preferences(NEW.user_id);
  RETURN NEW;
END;
$$;