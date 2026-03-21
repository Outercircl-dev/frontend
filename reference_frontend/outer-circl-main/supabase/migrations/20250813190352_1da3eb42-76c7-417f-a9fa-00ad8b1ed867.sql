-- PHASE 3: Fix Function Search Path Issues (Part 1)
-- Drop and recreate functions with proper search paths

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS public.wants_email_notifications(uuid);
DROP FUNCTION IF EXISTS public.is_subscription_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_subscription_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.cleanup_security_audit_logs();

-- Recreate with proper search paths
CREATE OR REPLACE FUNCTION public.wants_email_notifications(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT email_notifications 
     FROM public.profile_privacy_settings 
     WHERE user_id = p_user_id), 
    true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_subscription_admin(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = p_subscription_id AND ms.admin_user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_subscription_member(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = p_subscription_id 
    AND ms.user_id = p_user_id 
    AND ms.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Cleanup function for security audit logs
CREATE OR REPLACE FUNCTION public.cleanup_security_audit_logs()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete logs older than 90 days
  DELETE FROM public.security_audit_enhanced 
  WHERE timestamp < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';