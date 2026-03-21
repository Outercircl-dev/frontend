-- Fix Profile RLS: Remove public access and implement privacy-based policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create privacy-based profile access policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can view profiles based on privacy settings" 
ON public.profiles 
FOR SELECT 
USING (
  CASE 
    WHEN id = auth.uid() THEN true  -- Users can always see their own profile
    ELSE can_view_profile(id, auth.uid())  -- Use existing privacy function for others
  END
);

-- Update existing message RLS to be more explicit about authentication
DROP POLICY IF EXISTS "Users can send direct messages if recipient allows" ON public.messages;

CREATE POLICY "Authenticated users can send messages if recipient allows" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = sender_id AND 
  (
    (message_type = 'event' AND wants_event_messages(recipient_id) AND event_id IS NOT NULL) OR
    (message_type = 'direct' AND can_message_user(sender_id, recipient_id))
  )
);

-- Ensure notifications are properly secured
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can only view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);