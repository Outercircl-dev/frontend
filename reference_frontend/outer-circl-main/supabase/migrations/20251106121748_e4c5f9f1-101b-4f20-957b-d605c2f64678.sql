-- Fix foreign key constraint: events.host_id should reference profiles, not auth.users
-- This enables PostgREST implicit joins and fixes mobile loading issues

-- Drop the incorrect foreign key that references auth.users
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_host_id_fkey;

-- Add the correct foreign key that references profiles.id
ALTER TABLE public.events
ADD CONSTRAINT events_host_id_fkey 
FOREIGN KEY (host_id) 
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add index for performance optimization
CREATE INDEX IF NOT EXISTS idx_events_host_id ON public.events(host_id);

-- Verify all events have valid profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events e
    LEFT JOIN public.profiles p ON e.host_id = p.id
    WHERE p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot create foreign key: some events have host_id values that do not exist in profiles table';
  END IF;
END $$;