-- Fix mobile navbar profile icon and implement unique username requirements (corrected)

-- First, update existing users without usernames to have default usernames
UPDATE public.profiles 
SET username = 'user_' || 
  CASE 
    WHEN name IS NOT NULL AND name != '' THEN LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
    ELSE 'user'
  END || '_' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE username IS NULL OR username = '';

-- Make username not nullable if it isn't already
DO $$
BEGIN
  -- Check if username column is nullable and update if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'username' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
  END IF;
END
$$;

-- Create function to validate and check unique usernames
CREATE OR REPLACE FUNCTION public.is_username_unique(new_username text, user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = new_username 
    AND (user_id IS NULL OR id != user_id)
  );
$$;

-- Create trigger to validate username format before insert/update
CREATE OR REPLACE FUNCTION public.validate_username_format()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Validate username format (alphanumeric, underscores, min 3 chars, max 30 chars)
  IF NEW.username IS NULL OR 
     LENGTH(NEW.username) < 3 OR 
     LENGTH(NEW.username) > 30 OR
     NEW.username !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
  END IF;
  
  -- Check if username is unique (excluding current user for updates)
  IF NOT public.is_username_unique(NEW.username, NEW.id) THEN
    RAISE EXCEPTION 'Username "%" is already taken', NEW.username;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for username validation
DROP TRIGGER IF EXISTS validate_username_trigger ON public.profiles;
CREATE TRIGGER validate_username_trigger
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_username_format();

-- Create function to generate unique username suggestions
CREATE OR REPLACE FUNCTION public.suggest_unique_username(base_username text)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  suggestions text[] := '{}';
  candidate text;
  counter integer := 1;
BEGIN
  -- Clean the base username
  base_username := LOWER(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  
  -- Truncate if too long
  IF LENGTH(base_username) > 20 THEN
    base_username := SUBSTRING(base_username FROM 1 FOR 20);
  END IF;
  
  -- Generate up to 5 suggestions
  WHILE array_length(suggestions, 1) < 5 AND counter <= 100 LOOP
    candidate := base_username || '_' || counter;
    
    IF public.is_username_unique(candidate) THEN
      suggestions := array_append(suggestions, candidate);
    END IF;
    
    counter := counter + 1;
  END LOOP;
  
  RETURN suggestions;
END;
$$;