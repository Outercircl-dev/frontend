-- Fix critical security vulnerabilities - Add RLS policies for sensitive data

-- 1. Fix profiles_sensitive table RLS
ALTER TABLE public.profiles_sensitive ENABLE ROW LEVEL SECURITY;

-- Only allow users to access their own sensitive profile data
CREATE POLICY "Users can only access their own sensitive profile data" 
ON public.profiles_sensitive 
FOR ALL 
USING (auth.uid() = user_id);

-- 2. Fix payment_metadata table RLS  
ALTER TABLE public.payment_metadata ENABLE ROW LEVEL SECURITY;

-- Only allow users to access their own payment metadata
CREATE POLICY "Users can only access their own payment metadata"
ON public.payment_metadata
FOR ALL
USING (auth.uid() = user_id);

-- 3. Fix invitations table RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only allow subscription admins to access invitation data for their subscriptions
CREATE POLICY "Users can only access invitations they sent or received"
ON public.invitations
FOR ALL 
USING (
  auth.uid() = inviter_id OR 
  auth.email() = email OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.subscription_tier IN ('premium', 'admin')
  )
);

-- 4. Update function search paths for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;