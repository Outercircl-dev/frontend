
-- Create the user_ratings table
CREATE TABLE public.user_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a user can only rate another user once per event
  UNIQUE(event_id, rated_user_id, rating_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only rate other participants from events they attended
-- They cannot rate themselves
CREATE POLICY "Users can rate other event participants" 
  ON public.user_ratings 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = rating_user_id 
    AND auth.uid() != rated_user_id
    AND EXISTS (
      SELECT 1 FROM public.event_participants ep1
      WHERE ep1.event_id = user_ratings.event_id 
      AND ep1.user_id = auth.uid()
      AND ep1.status = 'attending'
    )
    AND EXISTS (
      SELECT 1 FROM public.event_participants ep2
      WHERE ep2.event_id = user_ratings.event_id 
      AND ep2.user_id = user_ratings.rated_user_id
      AND ep2.status = 'attending'
    )
  );

-- Policy 2: Users can only view ratings they have given (not received)
CREATE POLICY "Users can view ratings they gave" 
  ON public.user_ratings 
  FOR SELECT 
  USING (auth.uid() = rating_user_id);

-- Policy 3: No updates allowed for ratings
CREATE POLICY "No rating updates allowed" 
  ON public.user_ratings 
  FOR UPDATE 
  USING (false);

-- Policy 4: No deletions allowed for ratings
CREATE POLICY "No rating deletions allowed" 
  ON public.user_ratings 
  FOR DELETE 
  USING (false);
