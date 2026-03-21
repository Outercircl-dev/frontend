-- Fix Remaining Security Issues Migration - Final Version
-- Addresses Function Search Path Mutable and Extension in Public issues

-- 1. Fix all remaining functions that lack proper search_path
-- Update sanitize_html_input function (if it exists)
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Basic HTML/script sanitization
  -- Remove script tags and their content
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove potentially dangerous HTML tags
  input_text := regexp_replace(input_text, '<(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style)[^>]*>', '', 'gi');
  input_text := regexp_replace(input_text, '</(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style)>', '', 'gi');
  
  -- Remove javascript: and data: URLs
  input_text := regexp_replace(input_text, 'javascript:', '', 'gi');
  input_text := regexp_replace(input_text, 'data:', '', 'gi');
  
  -- Remove onXXX event handlers (simplified pattern)
  input_text := regexp_replace(input_text, 'on[a-z]+\s*=\s*[^>\s]*', '', 'gi');
  
  RETURN input_text;
END;
$function$;

-- Update is_friends_with function (if it exists)
CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE ((user_id = user1_id AND friend_id = user2_id) 
           OR (user_id = user2_id AND friend_id = user1_id))
    AND status = 'accepted'
  );
END;
$function$;

-- Update is_subscription_admin function (if it exists)
CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions 
    WHERE id = subscription_id AND admin_user_id = user_id
  );
$function$;

-- Update is_subscription_member function (if it exists)
CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots 
    WHERE subscription_id = is_subscription_member.subscription_id 
    AND user_id = is_subscription_member.user_id 
    AND status = 'active'
  );
$function$;

-- 2. Move only moveable extensions from public to extensions schema
DO $$
DECLARE
    ext_record RECORD;
    can_move boolean;
BEGIN
    -- Loop through all extensions in public schema, excluding system extensions
    FOR ext_record IN 
        SELECT extname 
        FROM pg_extension e 
        JOIN pg_namespace n ON e.extnamespace = n.oid 
        WHERE n.nspname = 'public'
        AND extname NOT IN (
            'plpgsql', 'pg_net', 'pg_stat_statements', 
            'pg_trgm', 'uuid-ossp', 'ltree', 'hstore',
            'postgis', 'postgis_topology', 'postgis_tiger_geocoder',
            'fuzzystrmatch', 'address_standardizer', 'address_standardizer_data_us'
        ) -- Exclude system and Supabase extensions that can't be moved
    LOOP
        -- Try to move extension to extensions schema
        BEGIN
            EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_record.extname);
            RAISE NOTICE 'Successfully moved extension % from public to extensions schema', ext_record.extname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not move extension % (this is normal for system extensions): %', ext_record.extname, SQLERRM;
        END;
    END LOOP;
END $$;

-- 3. Create missing functions with proper security settings
-- Create function to get user role securely
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $function$
  SELECT role::text FROM public.user_roles WHERE user_id = check_user_id LIMIT 1;
$function$;

-- Update all trigger functions to have proper search_path
CREATE OR REPLACE FUNCTION public.sanitize_profile_inputs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.name := public.sanitize_html_input(NEW.name);
  NEW.bio := public.sanitize_html_input(NEW.bio);
  NEW.location := public.sanitize_html_input(NEW.location);
  NEW.occupation := public.sanitize_html_input(NEW.occupation);
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_event_inputs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.title := public.sanitize_html_input(NEW.title);
  NEW.description := public.sanitize_html_input(NEW.description);
  NEW.location := public.sanitize_html_input(NEW.location);
  
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;