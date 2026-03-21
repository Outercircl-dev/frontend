-- Restore functional RLS while keeping security hardened (no functionality break)

-- PROFILES: revert to owner-only full access
DROP POLICY IF EXISTS "profiles_absolute_security_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_absolute_security_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_absolute_security_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_absolute_security_delete" ON public.profiles;

CREATE POLICY "profile_owner_full_access_select" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profile_owner_full_access_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_owner_full_access_update" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_owner_full_access_delete" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = id);

-- MEMBERSHIP_SUBSCRIPTIONS: restore original practical policies
DROP POLICY IF EXISTS "membership_subscriptions_absolute_security" ON public.membership_subscriptions;

CREATE POLICY "Admins can update their subscriptions" 
ON public.membership_subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = admin_user_id);

CREATE POLICY "Users can create their own subscription" 
ON public.membership_subscriptions
FOR INSERT TO authenticated
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Users can update their own subscription" 
ON public.membership_subscriptions
FOR UPDATE TO authenticated
USING (admin_user_id = auth.uid());

CREATE POLICY "Users can view subscriptions they admin" 
ON public.membership_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = admin_user_id);

CREATE POLICY "Users can view subscriptions they are members of" 
ON public.membership_subscriptions
FOR SELECT TO authenticated
USING (is_subscription_member(id, auth.uid()));

CREATE POLICY "Users can view their own subscription" 
ON public.membership_subscriptions
FOR SELECT TO authenticated
USING (admin_user_id = auth.uid());

-- MESSAGES: restore granular policies used by app
DROP POLICY IF EXISTS "messages_absolute_security_select" ON public.messages;
DROP POLICY IF EXISTS "messages_absolute_security_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_absolute_security_update" ON public.messages;
DROP POLICY IF EXISTS "messages_absolute_security_delete" ON public.messages;

CREATE POLICY "Authenticated users can send messages if recipient allows" 
ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL) AND (auth.uid() = sender_id) AND (
    (message_type = 'event' AND event_id IS NOT NULL) OR
    (message_type = 'direct' AND recipient_id IS NOT NULL AND can_message_user(sender_id, recipient_id))
  )
);

CREATE POLICY "Event participants can view event messages" 
ON public.messages
FOR SELECT TO authenticated
USING (
  (message_type = 'event' AND event_id IS NOT NULL) AND EXISTS (
    SELECT 1 FROM event_participants ep 
    WHERE ep.event_id = messages.event_id AND ep.user_id = auth.uid() AND ep.status = 'attending'
  )
);

CREATE POLICY "Users can delete their own messages" 
ON public.messages
FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

CREATE POLICY "Users can update read status on messages sent to them" 
ON public.messages
FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view messages sent to them" 
ON public.messages
FOR SELECT TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view messages they sent" 
ON public.messages
FOR SELECT TO authenticated
USING (auth.uid() = sender_id);

-- NOTE: Remaining WARNs require dashboard settings (extensions schema, leaked password protection)
