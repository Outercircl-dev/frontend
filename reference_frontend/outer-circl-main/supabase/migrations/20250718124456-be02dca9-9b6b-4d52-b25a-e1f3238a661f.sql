-- Create user agreements table to track user consent to terms and policies
CREATE TABLE public.user_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_type TEXT NOT NULL, -- 'terms_of_service', 'privacy_policy', 'community_guidelines', etc.
  agreement_version TEXT NOT NULL DEFAULT '1.0', -- Track version of agreement
  agreed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET, -- Store IP for legal compliance
  user_agent TEXT, -- Store user agent for legal compliance
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- Create policies for user agreements
CREATE POLICY "Users can view their own agreements" 
ON public.user_agreements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agreements" 
ON public.user_agreements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_user_agreements_user_id ON public.user_agreements(user_id);
CREATE INDEX idx_user_agreements_type ON public.user_agreements(agreement_type);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to record user agreement
CREATE OR REPLACE FUNCTION public.record_user_agreement(
  p_user_id UUID,
  p_agreement_type TEXT,
  p_agreement_version TEXT DEFAULT '1.0',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  agreement_id UUID;
BEGIN
  INSERT INTO public.user_agreements (
    user_id,
    agreement_type,
    agreement_version,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_agreement_type,
    p_agreement_version,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO agreement_id;
  
  RETURN agreement_id;
END;
$$;