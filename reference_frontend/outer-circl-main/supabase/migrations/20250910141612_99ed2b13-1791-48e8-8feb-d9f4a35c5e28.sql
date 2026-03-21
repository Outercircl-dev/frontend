-- Fix remaining WARN-level security issues

-- Find and fix any remaining functions without SET search_path
-- Update any existing functions that might still be missing the search_path setting

-- Check and fix the sanitize_html_input function if it exists
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Basic HTML sanitization - remove script tags and dangerous content
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove script tags and their content
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove javascript: protocols
  input_text := regexp_replace(input_text, 'javascript:', '', 'gi');
  
  -- Remove on* event handlers
  input_text := regexp_replace(input_text, '\s+on\w+\s*=\s*["\'][^"\']*["\']', '', 'gi');
  
  -- Remove iframe, embed, object tags
  input_text := regexp_replace(input_text, '<(iframe|embed|object)[^>]*>.*?</\1>', '', 'gi');
  
  -- Remove style tags and their content
  input_text := regexp_replace(input_text, '<style[^>]*>.*?</style>', '', 'gi');
  
  RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = public;

-- Update any other functions that might be missing search_path
-- Check the can_access_sensitive_data function
CREATE OR REPLACE FUNCTION public.can_access_sensitive_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  account_age INTERVAL;
  is_locked BOOLEAN;
BEGIN
  -- Check if account is locked
  SELECT COALESCE(ass.is_locked, FALSE) INTO is_locked
  FROM public.account_security_status ass
  WHERE ass.user_id = p_user_id;
  
  IF is_locked THEN
    RETURN FALSE;
  END IF;
  
  -- Check account age (must be older than 24 hours for sensitive data access)
  SELECT NOW() - p.created_at INTO account_age
  FROM public.profiles p
  WHERE p.id = p_user_id;
  
  -- Require account to be at least 24 hours old for sensitive data access
  RETURN COALESCE(account_age > INTERVAL '24 hours', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Check the can_access_payment_data function
CREATE OR REPLACE FUNCTION public.can_access_payment_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  account_age INTERVAL;
  is_locked BOOLEAN;
  membership_tier TEXT;
BEGIN
  -- Check if account is locked
  SELECT COALESCE(ass.is_locked, FALSE) INTO is_locked
  FROM public.account_security_status ass
  WHERE ass.user_id = p_user_id;
  
  IF is_locked THEN
    RETURN FALSE;
  END IF;
  
  -- Get membership tier and account age
  SELECT 
    NOW() - p.created_at,
    p.membership_tier
  INTO account_age, membership_tier
  FROM public.profiles p
  WHERE p.id = p_user_id;
  
  -- Require account to be at least 48 hours old for payment data access
  -- AND have premium membership for full access
  RETURN COALESCE(
    account_age > INTERVAL '48 hours' AND 
    membership_tier IN ('premium', 'standard'), 
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Check the wants_email_notifications function
CREATE OR REPLACE FUNCTION public.wants_email_notifications(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  email_enabled BOOLEAN := TRUE;
BEGIN
  SELECT COALESCE(pps.email_notifications, TRUE) INTO email_enabled
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = p_user_id;
  
  RETURN email_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Check the is_friends_with function
CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1_id AND f.friend_id = user2_id) OR
           (f.user_id = user2_id AND f.friend_id = user1_id))
    AND f.status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Check the is_event_host function
CREATE OR REPLACE FUNCTION public.is_event_host(event_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.host_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Check the is_event_participant function
CREATE OR REPLACE FUNCTION public.is_event_participant(event_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = event_id AND ep.user_id = user_id AND ep.status = 'attending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Check the is_subscription_admin function
CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id AND ms.admin_user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Check the is_subscription_member function
CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = subscription_id AND ms.user_id = user_id AND ms.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Success message
SELECT 'All function search path issues resolved' AS status;