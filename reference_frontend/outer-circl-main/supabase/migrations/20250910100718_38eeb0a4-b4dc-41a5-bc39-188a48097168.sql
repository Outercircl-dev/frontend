-- Fix Critical Security Issues: RLS Policies for Sensitive Data

-- 1. Fix invitations table - restrict to invited users and creators only
DROP POLICY IF EXISTS "Allow users to view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Allow users to accept invitations" ON public.invitations;
DROP POLICY IF EXISTS "Allow users to create invitations" ON public.invitations;

CREATE POLICY "Users can view their own invitations" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() = invited_user_id OR 
  auth.uid() = inviter_id
);

CREATE POLICY "Users can accept their own invitations" 
ON public.invitations 
FOR UPDATE 
USING (auth.uid() = invited_user_id)
WITH CHECK (auth.uid() = invited_user_id);

CREATE POLICY "Authenticated users can create invitations" 
ON public.invitations 
FOR INSERT 
WITH CHECK (auth.uid() = inviter_id);

-- 2. Fix profiles_sensitive table - complete lockdown
DROP POLICY IF EXISTS "Allow users to view their own sensitive data" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "Allow users to update their own sensitive data" ON public.profiles_sensitive;

-- Create security definer function for safe profile access
CREATE OR REPLACE FUNCTION public.get_current_user_profile_sensitive()
RETURNS public.profiles_sensitive AS $$
  SELECT * FROM public.profiles_sensitive WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Users can only access their own sensitive data" 
ON public.profiles_sensitive 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Fix payment_metadata table - maximum security
DROP POLICY IF EXISTS "payment_metadata_enhanced_security" ON public.payment_metadata;

CREATE POLICY "Secure payment metadata access" 
ON public.payment_metadata 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  auth.jwt() ->> 'aud' = 'authenticated'
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  auth.jwt() ->> 'aud' = 'authenticated'
);

-- 4. Fix security audit tables - admin only access
DROP POLICY IF EXISTS "Allow viewing audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Allow viewing enhanced audit logs" ON public.security_audit_enhanced;

CREATE POLICY "Admin only audit log access" 
ON public.security_audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin only enhanced audit access" 
ON public.security_audit_enhanced 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. Fix rate limiting tables - system and admin only
DROP POLICY IF EXISTS "Allow rate limit checks" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow sensitive rate limit checks" ON public.sensitive_access_rate_limits;

-- No public policies for rate limit tables - system functions only

-- 6. Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create secure function for user role checking
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Add comments for security documentation
COMMENT ON POLICY "Users can view their own invitations" ON public.invitations IS 
'Security: Users can only see invitations where they are either the inviter or invitee';

COMMENT ON POLICY "Users can only access their own sensitive data" ON public.profiles_sensitive IS 
'Security: Complete isolation - users can only access their own sensitive profile data';

COMMENT ON POLICY "Secure payment metadata access" ON public.payment_metadata IS 
'Security: Triple validation - authenticated user, JWT validation, and user ownership';

COMMENT ON POLICY "Admin only audit log access" ON public.security_audit_log IS 
'Security: Security logs restricted to admin users only';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';