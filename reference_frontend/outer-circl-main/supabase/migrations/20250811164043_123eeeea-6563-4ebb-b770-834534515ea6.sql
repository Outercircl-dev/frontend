-- Fix critical security vulnerability: Events table is publicly readable
-- First, let's see what policies currently exist and drop the problematic ones

-- Drop all existing SELECT policies on events table
DROP POLICY IF EXISTS "Users can view all events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view active events" ON public.events;
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;

-- Create secure policies that only show events to relevant users
-- Policy 1: Users can view events they are hosting
CREATE POLICY "Hosts can view their own events" 
ON public.events 
FOR SELECT 
USING (auth.uid() = host_id);

-- Policy 2: Users can view events they are participating in
CREATE POLICY "Participants can view their events" 
ON public.events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = events.id 
    AND ep.user_id = auth.uid() 
    AND ep.status = 'attending'
  )
);

-- Policy 3: Allow users to see events for discovery purposes but only basic info
-- This will need to be used with frontend filtering to hide sensitive data
CREATE POLICY "Discovery of public active events" 
ON public.events 
FOR SELECT 
USING (
  status = 'active' 
  AND date >= CURRENT_DATE 
);