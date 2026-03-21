-- Step 1: Fix Database Real-time Configuration

-- Add REPLICA IDENTITY FULL to messages and notifications tables for complete real-time data
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add messages and notifications tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;