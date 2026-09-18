
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload legal documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read legal documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete legal documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to legal documents" ON storage.objects;

-- Create simpler policies

-- Allow authenticated users to upload files to legal-documents bucket
CREATE POLICY "legal_documents_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents'
);

-- Allow authenticated users to read files from legal-documents bucket
CREATE POLICY "legal_documents_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'legal-documents'
);

-- Allow authenticated users to update files in legal-documents bucket
CREATE POLICY "legal_documents_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'legal-documents')
WITH CHECK (bucket_id = 'legal-documents');

-- Allow authenticated users to delete files from legal-documents bucket
CREATE POLICY "legal_documents_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'legal-documents'
);

-- Allow public read access (since bucket is public)
CREATE POLICY "legal_documents_public_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'legal-documents');
;
