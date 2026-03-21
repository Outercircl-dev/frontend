-- Security Fix: Secure Payment Information Access (Corrected)
-- Remove complex validation functions that may have loopholes
-- Implement strict, simple RLS policies for payment data

-- 1. Drop existing problematic RLS policies
DROP POLICY IF EXISTS "membership_subscriptions_admin_only_insert" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "membership_subscriptions_admin_only_select" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "membership_subscriptions_admin_only_update" ON public.membership_subscriptions;

-- 2. Drop potentially problematic validation functions
DROP FUNCTION IF EXISTS public.check_profile_access_rate_limit(uuid, text);
DROP FUNCTION IF EXISTS public.validate_payment_data_access(uuid, uuid);

-- 3. Create simple, secure helper functions
CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions 
    WHERE id = subscription_id AND admin_user_id = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = is_subscription_member.subscription_id 
    AND ms.user_id = is_subscription_member.user_id
    AND ms.status = 'active'
  );
$$;

-- 4. Create strict, simple RLS policies for payment data
-- Only subscription admins can insert new subscriptions
CREATE POLICY "subscription_admin_insert_only" ON public.membership_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_user_id);

-- Only subscription admins can view their own subscription data
CREATE POLICY "subscription_admin_select_only" ON public.membership_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = admin_user_id);

-- Only subscription admins can update their own subscription data
CREATE POLICY "subscription_admin_update_only" ON public.membership_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = admin_user_id)
WITH CHECK (auth.uid() = admin_user_id);

-- Explicitly deny all DELETE operations for payment data
CREATE POLICY "subscription_no_delete" ON public.membership_subscriptions
FOR DELETE
TO authenticated
USING (false);

-- 5. Add logging trigger for payment data access
CREATE OR REPLACE FUNCTION public.log_payment_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log payment data access for security monitoring
  PERFORM public.log_security_event(
    'payment_data_access',
    'membership_subscriptions',
    auth.uid(),
    true,
    jsonb_build_object(
      'subscription_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for payment access logging (corrected syntax)
DROP TRIGGER IF EXISTS log_payment_access_trigger ON public.membership_subscriptions;
CREATE TRIGGER log_payment_access_trigger
AFTER INSERT OR UPDATE ON public.membership_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_payment_access();

-- 6. Add security documentation
COMMENT ON TABLE public.membership_subscriptions IS 'SENSITIVE: Contains Stripe payment data. Access strictly limited to subscription administrators.';
COMMENT ON COLUMN public.membership_subscriptions.stripe_customer_id IS 'SENSITIVE: Stripe customer ID - admin access only';
COMMENT ON COLUMN public.membership_subscriptions.stripe_subscription_id IS 'SENSITIVE: Stripe subscription ID - admin access only';