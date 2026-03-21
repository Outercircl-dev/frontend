
-- Create table to track event participants
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'pending', 'declined')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_participants table
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for event_participants
CREATE POLICY "Users can view event participants" 
  ON public.event_participants 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can join events" 
  ON public.event_participants 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
  ON public.event_participants 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Event hosts can manage participants" 
  ON public.event_participants 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_participants.event_id 
      AND events.host_id = auth.uid()
    )
  );

-- Create function to automatically add host as participant when event is created
CREATE OR REPLACE FUNCTION public.add_host_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the host as an attending participant
  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (NEW.id, NEW.host_id, 'attending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add host as participant
CREATE TRIGGER add_host_as_participant_trigger
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.add_host_as_participant();
