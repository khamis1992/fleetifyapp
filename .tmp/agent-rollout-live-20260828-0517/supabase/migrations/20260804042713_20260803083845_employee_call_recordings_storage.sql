-- Private audio storage for employee call recordings.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  false,
  26214400,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Company users can upload call recordings" ON storage.objects;
CREATE POLICY "Company users can upload call recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-recordings'
  AND (storage.foldername(name))[1] IN (
    SELECT profile.company_id::text
    FROM public.profiles profile
    WHERE profile.user_id = (SELECT auth.uid())
  )
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Company users can view call recordings" ON storage.objects;
CREATE POLICY "Company users can view call recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND (storage.foldername(name))[1] IN (
    SELECT profile.company_id::text
    FROM public.profiles profile
    WHERE profile.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Recording owners can delete call recordings" ON storage.objects;
CREATE POLICY "Recording owners can delete call recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND (storage.foldername(name))[1] IN (
    SELECT profile.company_id::text
    FROM public.profiles profile
    WHERE profile.user_id = (SELECT auth.uid())
  )
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);;
