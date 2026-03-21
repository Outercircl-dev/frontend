-- Fix critical security vulnerabilities with correct column names based on actual schema

-- 1. Fix profiles_sensitive table RLS (uses 'id' not 'user_id')
ALTER TABLE public.profiles_sensitive ENABLE ROW LEVEL SECURITY;

-- Only allow users to access their own sensitive profile data
CREATE POLICY "Users can only access their own sensitive profile data" 
ON public.profiles_sensitive 
FOR ALL 
USING (auth.uid() = id);

-- 2. Fix payment_metadata table RLS (has user_id column)
ALTER TABLE public.payment_metadata ENABLE ROW LEVEL SECURITY;

-- Only allow users to access their own payment metadata
CREATE POLICY "Users can only access their own payment metadata"
ON public.payment_metadata
FOR ALL
USING (auth.uid() = user_id);

-- 3. Fix invitations table RLS (uses 'invited_by' not 'inviter_id')
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only allow users who sent or received invitations to access them
CREATE POLICY "Users can only access invitations they sent or received"
ON public.invitations
FOR ALL 
USING (
  auth.uid() = invited_by OR 
  auth.email() = email
);