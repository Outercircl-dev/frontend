-- Add function to track recurring activity limits for users
CREATE OR REPLACE FUNCTION public.check_recurring_activity_limits(p_user_id uuid, p_is_recurring boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Add trigger to enforce recurring activity limits
CREATE OR REPLACE FUNCTION public.enforce_recurring_activity_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only check on INSERT for recurring events
  IF TG_OP = 'INSERT' AND NEW.is_recurring = true THEN
    IF NOT public.check_recurring_activity_limits(NEW.host_id, NEW.is_recurring) THEN
      RAISE EXCEPTION 'You have reached your monthly limit for recurring activities. Standard users can create up to 2 recurring activities per month.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on events table
DROP TRIGGER IF EXISTS trigger_enforce_recurring_limits ON public.events;
CREATE TRIGGER trigger_enforce_recurring_limits
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_recurring_activity_limits();