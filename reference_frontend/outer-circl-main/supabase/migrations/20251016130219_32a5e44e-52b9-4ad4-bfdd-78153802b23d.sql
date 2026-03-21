-- Step 3: Explicitly deny public access to invitations table
-- This ensures unauthenticated users cannot access sensitive invitation data

CREATE POLICY "invitations_deny_public_access"
  ON invitations
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);