
-- Enable RLS on events table (if not already enabled)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Only create policies that don't already exist
DO $$ 
BEGIN
    -- Check and create "Anyone can view events" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'events' 
        AND policyname = 'Anyone can view events'
    ) THEN
        CREATE POLICY "Anyone can view events" 
        ON public.events 
        FOR SELECT 
        USING (true);
    END IF;

    -- Check and create "Authenticated users can create events" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'events' 
        AND policyname = 'Authenticated users can create events'
    ) THEN
        CREATE POLICY "Authenticated users can create events" 
        ON public.events 
        FOR INSERT 
        WITH CHECK (auth.uid() = host_id);
    END IF;

    -- Check and create "Event hosts can delete their events" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'events' 
        AND policyname = 'Event hosts can delete their events'
    ) THEN
        CREATE POLICY "Event hosts can delete their events" 
        ON public.events 
        FOR DELETE 
        USING (auth.uid() = host_id);
    END IF;
END $$;

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies with existence checks
DO $$ 
BEGIN
    -- Check and create "Anyone can view profiles" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Anyone can view profiles'
    ) THEN
        CREATE POLICY "Anyone can view profiles" 
        ON public.profiles 
        FOR SELECT 
        USING (true);
    END IF;

    -- Check and create "Users can update their own profile" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
        ON public.profiles 
        FOR UPDATE 
        USING (auth.uid() = id);
    END IF;

    -- Check and create "Users can create their own profile" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can create their own profile'
    ) THEN
        CREATE POLICY "Users can create their own profile" 
        ON public.profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;
