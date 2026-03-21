-- Update check_hosting_limits function to set 2 activities per month for standard users
CREATE OR REPLACE FUNCTION public.check_hosting_limits(p_user_id uuid, p_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_membership_tier text;
  events_count integer;
  monthly_limit integer;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_date IS NULL THEN
    p_date := CURRENT_DATE;
  END IF;
  
  -- Get user's membership tier
  SELECT membership_tier INTO user_membership_tier
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF user_membership_tier IS NULL THEN
    user_membership_tier := 'standard';
  END IF;
  
  -- Set limits based on membership tier
  IF user_membership_tier = 'premium' THEN
    monthly_limit := 999999; -- Unlimited for premium
  ELSE
    monthly_limit := 2; -- Standard users limited to 2 events per month
  END IF;
  
  -- Count events created this month by this user
  SELECT COUNT(*) INTO events_count
  FROM public.events
  WHERE host_id = p_user_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';
  
  -- Check if user can create more events
  RETURN events_count < monthly_limit;
END;
$function$;