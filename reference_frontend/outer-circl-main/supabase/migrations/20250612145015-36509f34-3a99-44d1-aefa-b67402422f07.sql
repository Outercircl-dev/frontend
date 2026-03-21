
-- Add missing UPDATE policy for events table
DO $$ 
BEGIN
    -- Check and create "Event hosts can update their events" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'events' 
        AND policyname = 'Event hosts can update their events'
    ) THEN
        CREATE POLICY "Event hosts can update their events" 
        ON public.events 
        FOR UPDATE 
        USING (auth.uid() = host_id);
    END IF;
END $$;
