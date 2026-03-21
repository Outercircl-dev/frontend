-- Drop existing storage policies to ensure clean state
DROP POLICY IF EXISTS "user_media_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "user_media_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "user_media_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "user_media_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "banners_public_select" ON storage.objects;
DROP POLICY IF EXISTS "banners_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "banners_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "banners_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "event_images_participant_select" ON storage.objects;
DROP POLICY IF EXISTS "event_images_participant_insert" ON storage.objects;
DROP POLICY IF EXISTS "event_images_participant_update" ON storage.objects;
DROP POLICY IF EXISTS "event_images_participant_delete" ON storage.objects;
DROP POLICY IF EXISTS "stock_images_public_select" ON storage.objects;
DROP POLICY IF EXISTS "stock_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "stock_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "stock_images_admin_delete" ON storage.objects;

-- USER-MEDIA BUCKET: Owner-only access for personal media
CREATE POLICY "user_media_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user_media_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user_media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user_media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- AVATARS BUCKET: Public read, owner write
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- BANNERS BUCKET: Public read, owner write
CREATE POLICY "banners_public_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'banners');

CREATE POLICY "banners_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'banners' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "banners_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'banners' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "banners_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'banners' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- EVENT-IMAGES BUCKET: Event participants only
CREATE POLICY "event_images_participant_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      -- Event host can access
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id::text = (storage.foldername(name))[1]
        AND e.host_id = auth.uid()
      )
      OR
      -- Event participants can access
      EXISTS (
        SELECT 1 FROM event_participants ep
        WHERE ep.event_id::text = (storage.foldername(name))[1]
        AND ep.user_id = auth.uid()
        AND ep.status = 'attending'
      )
    )
  );

CREATE POLICY "event_images_participant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id::text = (storage.foldername(name))[1]
        AND e.host_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM event_participants ep
        WHERE ep.event_id::text = (storage.foldername(name))[1]
        AND ep.user_id = auth.uid()
        AND ep.status = 'attending'
      )
    )
  );

CREATE POLICY "event_images_participant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id::text = (storage.foldername(name))[1]
        AND e.host_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM event_participants ep
        WHERE ep.event_id::text = (storage.foldername(name))[1]
        AND ep.user_id = auth.uid()
        AND ep.status = 'attending'
      )
    )
  );

CREATE POLICY "event_images_participant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id::text = (storage.foldername(name))[1]
        AND e.host_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM event_participants ep
        WHERE ep.event_id::text = (storage.foldername(name))[1]
        AND ep.user_id = auth.uid()
        AND ep.status = 'attending'
      )
    )
  );

-- ACTIVITYSTOCKIMAGES BUCKET: Public read-only, admin write
CREATE POLICY "stock_images_public_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'activitystockimages');

CREATE POLICY "stock_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'activitystockimages'
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "stock_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'activitystockimages'
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "stock_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'activitystockimages'
    AND has_role(auth.uid(), 'admin')
  );