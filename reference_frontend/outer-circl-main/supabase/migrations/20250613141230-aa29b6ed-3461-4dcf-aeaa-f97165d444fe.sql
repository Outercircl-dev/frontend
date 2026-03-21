
-- Fix missing RLS policies and enhance security with proper existence checks

-- Check and create missing policies only if they don't exist
DO $$ 
BEGIN
    -- Check and create "Users can create membership slots for their subscriptions" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'membership_slots' 
        AND policyname = 'Users can create membership slots for their subscriptions'
    ) THEN
        CREATE POLICY "Users can create membership slots for their subscriptions" 
        ON public.membership_slots 
        FOR INSERT 
        WITH CHECK (public.is_subscription_admin(subscription_id, auth.uid()));
    END IF;

    -- Check and create "Admins can create invitations" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'invitations' 
        AND policyname = 'Admins can create invitations'
    ) THEN
        CREATE POLICY "Admins can create invitations" 
        ON public.invitations 
        FOR INSERT 
        WITH CHECK (public.is_subscription_admin(subscription_id, auth.uid()));
    END IF;
END $$;

-- Add security function to check event ownership
CREATE OR REPLACE FUNCTION public.is_event_owner(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND host_id = user_id
  );
$$;

-- Add audit trail table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create user_roles table and enum if they don't exist
DO $$
BEGIN
    -- Create enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check and create audit log policies
DO $$ 
BEGIN
    -- Only admins can view audit logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_audit_log' 
        AND policyname = 'Only admins can view audit logs'
    ) THEN
        CREATE POLICY "Only admins can view audit logs" 
        ON public.security_audit_log 
        FOR SELECT 
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    -- Users can view their own roles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' 
        AND policyname = 'Users can view their own roles'
    ) THEN
        CREATE POLICY "Users can view their own roles" 
        ON public.user_roles 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- Only admins can manage user roles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' 
        AND policyname = 'Only admins can manage user roles'
    ) THEN
        CREATE POLICY "Only admins can manage user roles" 
        ON public.user_roles 
        FOR ALL 
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Add function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, 
    success, error_message
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id,
    p_success, p_error_message
  );
END;
$$;

-- Add constraint to ensure profile data integrity (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_format'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_email_format 
        CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Add indexes for better performance and security
CREATE INDEX IF NOT EXISTS idx_membership_slots_user_id ON public.membership_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_events_host_id ON public.events(host_id);
CREATE INDEX IF NOT EXISTS idx_invitations_subscription_id ON public.invitations(subscription_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
