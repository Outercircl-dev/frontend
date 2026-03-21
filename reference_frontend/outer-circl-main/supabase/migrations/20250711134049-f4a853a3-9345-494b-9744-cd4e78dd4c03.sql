-- Update user-media bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'user-media';

-- Create storage policies for user-media bucket
CREATE POLICY "Users can view their own media files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'user-media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own media files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'user-media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own media files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'user-media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own media files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'user-media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policies for avatar and banner buckets to be more specific
CREATE POLICY "Users can view all avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Same for banners
CREATE POLICY "Users can view all banners" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'banners');

CREATE POLICY "Users can upload their own banner" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own banner" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own banner" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);