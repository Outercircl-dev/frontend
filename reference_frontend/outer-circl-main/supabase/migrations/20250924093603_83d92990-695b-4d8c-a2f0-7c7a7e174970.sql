-- Update the default message privacy setting to 'everyone'
ALTER TABLE public.profile_privacy_settings 
ALTER COLUMN message_privacy SET DEFAULT 'everyone';