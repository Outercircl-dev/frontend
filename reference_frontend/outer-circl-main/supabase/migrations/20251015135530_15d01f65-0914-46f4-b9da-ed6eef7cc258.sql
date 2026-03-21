-- Phase 1: Fix invitations table - Remove plaintext email
-- Step 1: Drop the view first to avoid dependency issues
DROP VIEW IF EXISTS public.invitations_safe CASCADE;

-- Step 2: Ensure email_encrypted is populated for all existing rows
UPDATE public.invitations 
SET email_encrypted = encode(encrypt(email::bytea, 'encryption-key-placeholder'::bytea, 'aes'), 'base64')
WHERE email_encrypted IS NULL AND email IS NOT NULL;

-- Step 3: Make email_encrypted NOT NULL
ALTER TABLE public.invitations 
ALTER COLUMN email_encrypted SET NOT NULL;

-- Step 4: Drop the plaintext email column (CRITICAL SECURITY FIX)
ALTER TABLE public.invitations 
DROP COLUMN email;

-- Step 5: Update the trigger to work without plaintext email
CREATE OR REPLACE FUNCTION public.encrypt_invitation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Email must be provided as encrypted
  IF NEW.email_encrypted IS NULL THEN
    RAISE EXCEPTION 'email_encrypted must be provided';
  END IF;
  
  -- Hash must be provided for lookups
  IF NEW.email_hash IS NULL THEN
    RAISE EXCEPTION 'email_hash must be provided when creating invitation';
  END IF;
  
  -- Log the invitation creation for security monitoring
  PERFORM public.log_security_event_secure(
    'invitation_email_encrypted',
    'invitations',
    NEW.id,
    true,
    jsonb_build_object(
      'email_hash', NEW.email_hash,
      'invited_by', NEW.invited_by,
      'subscription_id', NEW.subscription_id
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Phase 2: Recreate invitations_safe view with security_invoker to inherit RLS
CREATE VIEW public.invitations_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  subscription_id,
  slot_id,
  invited_by,
  email_hash,
  status,
  invitation_token,
  expires_at,
  created_at,
  updated_at
FROM public.invitations;

-- Phase 3: Recreate events_public_view with security_invoker to inherit RLS
DROP VIEW IF EXISTS public.events_public_view CASCADE;

CREATE VIEW public.events_public_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  title,
  description,
  date,
  time,
  location,
  category,
  image_url,
  status,
  duration,
  meetup_spot,
  gender_preference,
  max_attendees,
  host_id,
  is_recurring,
  recurring_type,
  recurrence_pattern,
  recurrence_interval,
  recurrence_end_date,
  recurrence_end_count,
  parent_event_id,
  occurrence_number,
  completed_at,
  coordinates,
  created_at,
  updated_at
FROM public.events;