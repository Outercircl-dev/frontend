-- Security Hardening: Storage Buckets Only
-- Make avatars and banners private with authenticated-only access

-- Step 1: Make buckets private
UPDATE storage.buckets 
SET public = false 
WHERE name IN ('avatars', 'banners');

-- Step 2: Remove old public SELECT policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Banner images are publicly accessible" ON storage.objects;

-- Step 3: Add authenticated-only SELECT policies
CREATE POLICY "Auth users view avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Auth users view banners"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'banners');