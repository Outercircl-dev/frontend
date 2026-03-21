-- Fix security warnings: Function Search Path Mutable
-- Update functions to have explicit search_path settings

-- Fix functions that are missing explicit search_path
CREATE OR REPLACE FUNCTION public.validate_app_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure personalization_opt is valid
  IF NEW.personalization_opt NOT IN ('full', 'limited', 'minimal') THEN
    RAISE EXCEPTION 'Invalid personalization option: %', NEW.personalization_opt;
  END IF;
  
  -- Ensure message_privacy is valid
  IF NEW.message_privacy NOT IN ('everyone', 'followers', 'nobody') THEN
    RAISE EXCEPTION 'Invalid message privacy option: %', NEW.message_privacy;
  END IF;
  
  -- If personalization is minimal, disable ad personalization
  IF NEW.personalization_opt = 'minimal' THEN
    NEW.ad_personalization := false;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also ensure any other functions have the proper search_path
CREATE OR REPLACE FUNCTION public.validate_and_sanitize_input(p_input text, p_input_type text DEFAULT 'text'::text, p_max_length integer DEFAULT 1000)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Trim whitespace
  p_input := TRIM(p_input);
  
  -- Check length
  IF LENGTH(p_input) > p_max_length THEN
    RAISE EXCEPTION 'Input too long. Maximum length is %', p_max_length;
  END IF;
  
  -- Basic sanitization based on type
  CASE p_input_type
    WHEN 'email' THEN
      -- Basic email validation
      IF p_input !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
      END IF;
    WHEN 'username' THEN
      -- Alphanumeric and underscore only
      IF p_input !~ '^[A-Za-z0-9_]+$' THEN
        RAISE EXCEPTION 'Username can only contain letters, numbers, and underscores';
      END IF;
    WHEN 'text', 'name' THEN
      -- Remove any potential HTML/script tags
      p_input := REGEXP_REPLACE(p_input, '<[^>]*>', '', 'g');
    ELSE
      -- Default: just remove HTML tags
      p_input := REGEXP_REPLACE(p_input, '<[^>]*>', '', 'g');
  END CASE;
  
  RETURN p_input;
END;
$function$;