-- Create table to store generated homepage images
CREATE TABLE public.homepage_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  image_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, image_key)
);

-- Enable RLS
ALTER TABLE public.homepage_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access for homepage images
CREATE POLICY "Homepage images are publicly readable" 
ON public.homepage_images 
FOR SELECT 
USING (true);

-- Only admins can insert/update homepage images
CREATE POLICY "Only admins can manage homepage images" 
ON public.homepage_images 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_homepage_images_updated_at
BEFORE UPDATE ON public.homepage_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();