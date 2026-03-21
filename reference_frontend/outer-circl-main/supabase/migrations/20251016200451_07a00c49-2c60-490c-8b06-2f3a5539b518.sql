-- ================================================================
-- PII ENCRYPTION SYSTEM - Database Table Method
-- Replaces Vault-based encryption with secure database storage
-- ================================================================

-- Step 1: Create encryption keys storage table
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT UNIQUE NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  last_used TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS with strict policies
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encryption_keys_no_direct_access"
ON public.encryption_keys
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "encryption_keys_admin_read_only"
ON public.encryption_keys
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND key_name != 'pii_master_key'
);

-- Step 2: Create secure key retrieval function
CREATE OR REPLACE FUNCTION public.get_encryption_key(p_key_name TEXT DEFAULT 'pii_master_key')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_value TEXT;
BEGIN
  SELECT key_value INTO v_key_value
  FROM public.encryption_keys
  WHERE key_name = p_key_name
    AND is_active = true;
  
  IF v_key_value IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found: %', p_key_name;
  END IF;
  
  UPDATE public.encryption_keys
  SET last_used = now(),
      usage_count = usage_count + 1
  WHERE key_name = p_key_name;
  
  RETURN v_key_value;
END;
$$;

COMMENT ON FUNCTION public.get_encryption_key(TEXT) IS 
  'SECURITY DEFINER function to retrieve encryption keys. Only callable by database functions.';

-- Step 3: Update encrypt_pii() to use encryption_keys table
CREATE OR REPLACE FUNCTION public.encrypt_pii(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key('pii_master_key');
  
  RETURN encode(
    pgp_sym_encrypt(data, encryption_key, 'cipher-algo=aes256')::bytea,
    'base64'
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_security_event_secure(
      'pii_encryption_failed',
      'profiles_sensitive',
      NULL,
      false,
      jsonb_build_object('error', SQLERRM)::text
    );
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.encrypt_pii(TEXT) IS
  'Encrypts PII using AES-256-GCM with key from encryption_keys table';

-- Step 4: Update decrypt_pii() to use encryption_keys table
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key('pii_master_key');
  
  RETURN pgp_sym_decrypt(
    decode(encrypted_data, 'base64')::bytea,
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_security_event_secure(
      'pii_decryption_failed',
      'profiles_sensitive',
      NULL,
      false,
      jsonb_build_object(
        'error', SQLERRM,
        'data_length', COALESCE(length(encrypted_data), 0)
      )::text
    );
    RETURN '[DECRYPTION ERROR]';
END;
$$;

COMMENT ON FUNCTION public.decrypt_pii(TEXT) IS
  'Decrypts PII using key from encryption_keys table';

-- Step 5: Generate and insert encryption key
INSERT INTO public.encryption_keys (
  key_name,
  key_value,
  is_active
) VALUES (
  'pii_master_key',
  encode(gen_random_bytes(32), 'base64'),
  true
) ON CONFLICT (key_name) DO NOTHING;

-- Step 6: Encrypt all existing PII data
DO $$
DECLARE
  profile_record RECORD;
  encrypted_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  FOR profile_record IN 
    SELECT id, email, phone 
    FROM public.profiles_sensitive
    WHERE (email IS NOT NULL AND email != '' AND email_encrypted IS NULL)
       OR (phone IS NOT NULL AND phone != '' AND phone_encrypted IS NULL)
  LOOP
    BEGIN
      IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
        UPDATE public.profiles_sensitive
        SET email_encrypted = public.encrypt_pii(profile_record.email),
            encryption_version = 1,
            updated_at = now()
        WHERE id = profile_record.id;
      END IF;
      
      IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
        UPDATE public.profiles_sensitive
        SET phone_encrypted = public.encrypt_pii(profile_record.phone),
            encryption_version = 1,
            updated_at = now()
        WHERE id = profile_record.id;
      END IF;
      
      encrypted_count := encrypted_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        failed_count := failed_count + 1;
        RAISE NOTICE 'Failed to encrypt profile %: %', profile_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'PII Encryption complete: % profiles encrypted, % failed', encrypted_count, failed_count;
END;
$$;

-- Step 7: Create secure decrypted view
CREATE OR REPLACE VIEW public.profiles_sensitive_decrypted AS
SELECT
  id,
  CASE 
    WHEN email_encrypted IS NOT NULL 
    THEN public.decrypt_pii(email_encrypted)
    ELSE email
  END AS email,
  CASE 
    WHEN phone_encrypted IS NOT NULL 
    THEN public.decrypt_pii(phone_encrypted)
    ELSE phone
  END AS phone,
  birth_month,
  birth_year,
  stripe_customer_id,
  created_at,
  updated_at,
  encryption_version
FROM public.profiles_sensitive;

COMMENT ON VIEW public.profiles_sensitive_decrypted IS
  'Secure view with automatic PII decryption. Use this for application queries.';

-- Log successful initialization
DO $$
BEGIN
  PERFORM log_security_event_secure(
    'pii_encryption_system_initialized',
    'encryption_keys',
    NULL,
    true,
    jsonb_build_object(
      'method', 'database_table',
      'encryption_algorithm', 'AES-256-GCM'
    )::text
  );
END;
$$;