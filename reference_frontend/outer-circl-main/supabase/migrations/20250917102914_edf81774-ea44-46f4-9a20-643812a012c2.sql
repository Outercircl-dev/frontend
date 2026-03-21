-- Fix the functions that are incorrectly trying to access email from profiles table

-- 1. Fix handle_new_user function - it should not insert email into profiles table
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert into profiles table (without email)
  INSERT INTO public.profiles (id, name, profile_completed)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
    false
  );
  
  -- Insert email into profiles_sensitive table
  INSERT INTO public.profiles_sensitive (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  
  RETURN NEW;
END;
$$;

-- 2. Fix sanitize_sensitive_profile_data function - it should work on profiles_sensitive table, not profiles
DROP FUNCTION IF EXISTS public.sanitize_sensitive_profile_data();

CREATE OR REPLACE FUNCTION public.sanitize_sensitive_profile_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Clear sensitive data if accessed by unauthorized user
    IF auth.uid() != NEW.id THEN
        RAISE EXCEPTION 'Unauthorized access to sensitive profile data';
    END IF;
    
    -- Validate email format and prevent injection
    IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Sanitize phone number
    IF NEW.phone IS NOT NULL THEN
        NEW.phone := regexp_replace(NEW.phone, '[^0-9+\-\(\)\s]', '', 'g');
        IF length(NEW.phone) > 20 THEN
            NEW.phone := left(NEW.phone, 20);
        END IF;
    END IF;
    
    -- Log access to sensitive data
    PERFORM public.log_security_event_secure(
        'sensitive_profile_access',
        'profiles_sensitive',
        auth.uid(),
        TRUE,
        jsonb_build_object(
            'action', TG_OP,
            'accessed_fields', CASE 
                WHEN OLD IS NULL THEN 'new_profile'
                ELSE 'updated_profile'
            END
        )::text
    );
    
    RETURN NEW;
END;
$$;