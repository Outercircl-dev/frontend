-- Add gender_preference field to events table for premium user feature
ALTER TABLE public.events 
ADD COLUMN gender_preference text CHECK (gender_preference IN ('male', 'female', 'no_preference'));