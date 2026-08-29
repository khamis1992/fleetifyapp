
-- Create legal-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-documents',
  'legal-documents',
  true,
  52428800,  -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their company folder
CREATE POLICY "Allow authenticated users to upload legal documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies 
    WHERE id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Allow authenticated users to read their company documents
CREATE POLICY "Allow authenticated users to read legal documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'legal-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies 
    WHERE id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Allow authenticated users to delete their company documents
CREATE POLICY "Allow authenticated users to delete legal documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'legal-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies 
    WHERE id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Allow public read access since bucket is public
CREATE POLICY "Allow public read access to legal documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'legal-documents');
;
