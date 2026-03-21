
-- Add missing columns to existing events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS coordinates JSONB;

-- Enable RLS on events table (if not already enabled)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Event hosts can update their events" ON public.events;
DROP POLICY IF EXISTS "Event hosts can delete their events" ON public.events;

-- Create RLS policies for events table
CREATE POLICY "Anyone can view active events" 
ON public.events 
FOR SELECT 
USING (status = 'active' OR status IS NULL);

CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Event hosts can update their events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = host_id);

CREATE POLICY "Event hosts can delete their events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = host_id);

-- Ensure profiles table has proper RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add RLS policies for membership tables
DROP POLICY IF EXISTS "Users can view subscriptions they admin" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Users can view subscriptions they are members of" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Admins can update their subscriptions" ON public.membership_subscriptions;

CREATE POLICY "Users can view subscriptions they admin" 
ON public.membership_subscriptions 
FOR SELECT 
USING (auth.uid() = admin_user_id);

CREATE POLICY "Users can view subscriptions they are members of" 
ON public.membership_subscriptions 
FOR SELECT 
USING (public.is_subscription_member(id, auth.uid()));

CREATE POLICY "Users can create their own subscriptions" 
ON public.membership_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admins can update their subscriptions" 
ON public.membership_subscriptions 
FOR UPDATE 
USING (auth.uid() = admin_user_id);

-- Add RLS policies for membership slots
DROP POLICY IF EXISTS "Users can view slots in subscriptions they admin" ON public.membership_slots;
DROP POLICY IF EXISTS "Users can view slots in subscriptions they are members of" ON public.membership_slots;
DROP POLICY IF EXISTS "Users can view their own slots" ON public.membership_slots;
DROP POLICY IF EXISTS "Admins can update slots in their subscriptions" ON public.membership_slots;

CREATE POLICY "Users can view slots in subscriptions they admin" 
ON public.membership_slots 
FOR SELECT 
USING (public.is_subscription_admin(subscription_id, auth.uid()));

CREATE POLICY "Users can view slots in subscriptions they are members of" 
ON public.membership_slots 
FOR SELECT 
USING (public.is_subscription_member(subscription_id, auth.uid()));

CREATE POLICY "Users can view their own slots" 
ON public.membership_slots 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update slots in their subscriptions" 
ON public.membership_slots 
FOR UPDATE 
USING (public.is_subscription_admin(subscription_id, auth.uid()));

-- Add RLS policies for invitations
DROP POLICY IF EXISTS "Users can view invitations they sent" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view invitations for their subscriptions" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations for their subscriptions" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations for their subscriptions" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations for their subscriptions" ON public.invitations;

CREATE POLICY "Users can view invitations they sent" 
ON public.invitations 
FOR SELECT 
USING (auth.uid() = invited_by);

CREATE POLICY "Admins can view invitations for their subscriptions" 
ON public.invitations 
FOR SELECT 
USING (public.is_subscription_admin(subscription_id, auth.uid()));

CREATE POLICY "Admins can create invitations for their subscriptions" 
ON public.invitations 
FOR INSERT 
WITH CHECK (public.is_subscription_admin(subscription_id, auth.uid()));

CREATE POLICY "Admins can update invitations for their subscriptions" 
ON public.invitations 
FOR UPDATE 
USING (public.is_subscription_admin(subscription_id, auth.uid()));

CREATE POLICY "Admins can delete invitations for their subscriptions" 
ON public.invitations 
FOR DELETE 
USING (public.is_subscription_admin(subscription_id, auth.uid()));
