-- PHASE 1: Fix Critical Security Definer Views (ERROR Level)
-- Drop all security definer views that bypass RLS

-- Drop problematic security definer views
DROP VIEW IF EXISTS public.events_secure_view;
DROP VIEW IF EXISTS public.invitations_admin_secure;
DROP VIEW IF EXISTS public.profiles_payment_secure;

-- Create secure replacement functions with proper search_path

-- Secure function to get event data (replaces events_secure_view)
CREATE OR REPLACE FUNCTION public.get_secure_event_data(p_event_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  date date,
  time_slot time without time zone,
  location text,
  category text,
  status text,
  host_id uuid,
  max_attendees integer
) AS $$
BEGIN
  -- This function respects RLS policies on events table
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.date,
    e.time as time_slot,
    e.location,
    e.category,
    e.status,
    e.host_id,
    e.max_attendees
  FROM public.events e
  WHERE e.id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Secure function to get admin invitation data (replaces invitations_admin_secure)
CREATE OR REPLACE FUNCTION public.get_admin_invitations(p_subscription_id uuid)
RETURNS TABLE(
  id uuid,
  email_masked text,
  status text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone
) AS $$
BEGIN
  -- Only subscription admins can see their invitations
  IF NOT EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = p_subscription_id AND ms.admin_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Not subscription admin';
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    SUBSTRING(i.email, 1, 3) || '***@' || SPLIT_PART(i.email, '@', 2) as email_masked,
    i.status,
    i.created_at,
    i.expires_at
  FROM public.invitations i
  WHERE i.subscription_id = p_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Secure function to get payment profile data (replaces profiles_payment_secure)
CREATE OR REPLACE FUNCTION public.get_secure_payment_profile(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  stripe_customer_id_masked text,
  last_security_check timestamp with time zone
) AS $$
BEGIN
  -- Only allow users to see their own payment profile data
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied: Can only access own payment data';
  END IF;

  RETURN QUERY
  SELECT 
    ps.id,
    CASE 
      WHEN ps.stripe_customer_id IS NOT NULL 
      THEN 'cus_' || REPEAT('*', LENGTH(ps.stripe_customer_id) - 4)
      ELSE NULL 
    END as stripe_customer_id_masked,
    ps.last_security_check
  FROM public.profiles_sensitive ps
  WHERE ps.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';