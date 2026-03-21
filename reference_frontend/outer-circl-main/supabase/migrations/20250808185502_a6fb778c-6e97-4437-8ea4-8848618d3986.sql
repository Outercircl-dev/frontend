-- Create activitystockimages storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('activitystockimages', 'activitystockimages', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for activity stock images (public read access)
CREATE POLICY "Anyone can view activity stock images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'activitystockimages');

-- Only admins can manage activity stock images
CREATE POLICY "Only admins can upload activity stock images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'activitystockimages' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update activity stock images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'activitystockimages' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete activity stock images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'activitystockimages' AND has_role(auth.uid(), 'admin'::app_role));