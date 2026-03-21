-- Update user-media bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'user-media';

-- Drop existing storage policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media files" ON storage.objects;

-- Create storage policies for user-media bucket (private access)
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