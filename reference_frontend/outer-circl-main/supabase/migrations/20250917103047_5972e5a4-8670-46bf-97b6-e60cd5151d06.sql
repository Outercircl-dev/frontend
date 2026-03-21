-- Fix the functions that are incorrectly trying to access email from profiles table
-- Need to drop triggers first, then functions, then recreate

-- 1. Drop the trigger first, then the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create the corrected handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert into profiles table (without email - email goes to profiles_sensitive)
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

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix sanitize_sensitive_profile_data function
DROP FUNCTION IF EXISTS public.sanitize_sensitive_profile_data() CASCADE;

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
    
    -- Log access to sensitive data (using the working log function)
    PERFORM public.log_security_event_secure(
        'sensitive_profile_access',
        'profiles_sensitive',
        auth.uid(),
        TRUE,
        jsonb_build_object(
            'action', TG_OP,
            'timestamp', now()
        )::text
    );
    
    RETURN NEW;
END;
$$;