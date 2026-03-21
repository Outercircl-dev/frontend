-- Step 2: Remove time-based restriction from payment_metadata
-- This addresses the CRITICAL payment data exposure finding

DROP POLICY IF EXISTS "payment_metadata_maximum_security_access" ON payment_metadata;

CREATE POLICY "payment_metadata_user_only_access"
  ON payment_metadata
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND auth.jwt() IS NOT NULL
    AND (auth.jwt() ->> 'aud') = 'authenticated'
    AND (auth.jwt() ->> 'role') = 'authenticated'
    AND auth.email() IS NOT NULL
    AND (auth.jwt() ->> 'session_id') IS NOT NULL
    AND (auth.jwt() ->> 'email_confirmed_at') IS NOT NULL
    AND validate_sensitive_access(user_id, 'payment_metadata')
    AND check_rate_limit_sensitive(auth.uid(), 'payment_metadata')
    AND check_payment_access_rate_limit(auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND validate_sensitive_access(user_id, 'payment_metadata')
    AND check_payment_access_rate_limit(auth.uid())
  );