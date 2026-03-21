-- Fix security warnings from the migration

-- Fix function search path by setting it explicitly for our functions
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

CREATE OR REPLACE FUNCTION public.validate_username_format()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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