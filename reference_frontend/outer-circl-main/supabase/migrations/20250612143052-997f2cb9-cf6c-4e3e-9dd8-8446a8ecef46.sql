
-- Enable Row Level Security on all tables
ALTER TABLE public.membership_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is admin of a subscription
CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions 
    WHERE id = subscription_id AND admin_user_id = user_id
  );
$$;

-- Create security definer function to check if user is member of a subscription
CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots 
    WHERE subscription_id = is_subscription_member.subscription_id 
    AND user_id = is_subscription_member.user_id 
    AND status = 'active'
  );
$$;

-- RLS Policies for membership_subscriptions table
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

-- RLS Policies for membership_slots table
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

CREATE POLICY "Users can update their own slots when accepting invitations"
  ON public.membership_slots
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for invitations table
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
