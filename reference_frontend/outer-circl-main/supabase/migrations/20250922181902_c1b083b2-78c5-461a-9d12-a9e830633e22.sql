-- Fix security warnings by updating functions without search_path set
-- Update functions that don't have search_path set to be security compliant

-- Fix get_personalization_level function
CREATE OR REPLACE FUNCTION public.get_personalization_level(user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(personalization_opt, 'full')
  FROM public.profile_privacy_settings
  WHERE user_id = get_personalization_level.user_id;
$function$;

-- Fix is_subscription_member function  
CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = is_subscription_member.subscription_id 
    AND ms.user_id = is_subscription_member.user_id
    AND ms.status = 'active'
  );
$function$;