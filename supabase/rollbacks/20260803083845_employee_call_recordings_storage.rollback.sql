DROP POLICY IF EXISTS "Recording owners can delete call recordings" ON storage.objects;
DROP POLICY IF EXISTS "Company users can view call recordings" ON storage.objects;
DROP POLICY IF EXISTS "Company users can upload call recordings" ON storage.objects;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'call-recordings'
  ) THEN
    RAISE EXCEPTION
      'The call-recordings bucket is not empty. Remove its files through the Supabase Storage API before running this rollback.';
  END IF;
END;
$$;

DELETE FROM storage.buckets WHERE id = 'call-recordings';
