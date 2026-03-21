-- Add recurring_type column to events table for tracking standard vs premium recurring events
ALTER TABLE public.events 
ADD COLUMN recurring_type TEXT CHECK (recurring_type IN ('standard', 'premium')) DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.events.recurring_type IS 'Type of recurring event: standard (simplified options) or premium (full custom options)';

-- Update the check_recurring_activity_limits function to handle standard vs premium limits correctly
CREATE OR REPLACE FUNCTION public.check_recurring_activity_limits(p_user_id uuid, p_is_recurring boolean, p_recurring_type text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  -- For standard users, count all recurring events
  -- For premium users with standard type, still count all (backwards compatibility)
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

-- Update the enforce_recurring_activity_limits trigger function
CREATE OR REPLACE FUNCTION public.enforce_recurring_activity_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_membership_tier text;
BEGIN
  -- Only check on INSERT for recurring events
  IF TG_OP = 'INSERT' AND NEW.is_recurring = true THEN
    -- Get user's membership tier
    SELECT membership_tier INTO user_membership_tier
    FROM public.profiles
    WHERE id = NEW.host_id;
    
    -- Set recurring_type based on membership if not already set
    IF NEW.recurring_type IS NULL THEN
      IF user_membership_tier = 'premium' THEN
        NEW.recurring_type := 'premium';
      ELSE
        NEW.recurring_type := 'standard';
      END IF;
    END IF;
    
    -- Check limits
    IF NOT public.check_recurring_activity_limits(NEW.host_id, NEW.is_recurring, NEW.recurring_type) THEN
      RAISE EXCEPTION 'You have reached your monthly limit for recurring activities. Standard users can create up to 2 recurring activities per month. Upgrade to Premium for unlimited recurring activities.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;