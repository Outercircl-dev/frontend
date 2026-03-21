-- Step 1: Remove time-based restriction from profiles_sensitive only
-- This addresses the CRITICAL payment data exposure finding

DROP POLICY IF EXISTS "profiles_sensitive_secure_access" ON profiles_sensitive;

CREATE POLICY "profiles_sensitive_user_only_access"
  ON profiles_sensitive
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND auth.jwt() IS NOT NULL
    AND (auth.jwt() ->> 'aud') = 'authenticated'
    AND (auth.jwt() ->> 'email_confirmed_at') IS NOT NULL
    AND validate_sensitive_access(id, 'profiles_sensitive')
    AND check_rate_limit_sensitive(auth.uid(), 'profiles_sensitive')
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND validate_sensitive_access(id, 'profiles_sensitive')
  );