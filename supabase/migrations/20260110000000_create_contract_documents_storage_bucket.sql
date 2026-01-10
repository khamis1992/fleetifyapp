-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  false, -- Private bucket
  104857600, -- 100MB max file size
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
    'application/json'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for contract documents
-- Policy: Authenticated users can upload documents
CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'contract-documents' AND
  auth.role() = 'authenticated'
);

-- Policy: Users can view documents if they have access to the contract
CREATE POLICY "Users can view contract documents they have access to"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'contract-documents' AND
  (
    -- Super admins can view all
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    ) OR
    -- Users can view documents for contracts in their company
    EXISTS (
      SELECT 1
      FROM contract_documents cd
      JOIN contracts c ON c.id = cd.contract_id
      WHERE cd.file_path = storage.objects.name
      AND c.company_id = get_user_company(auth.uid())
    )
  )
);

-- Policy: Users can update documents in their company
CREATE POLICY "Users can update contract documents in their company"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'contract-documents' AND
  EXISTS (
    SELECT 1
    FROM contract_documents cd
    JOIN contracts c ON c.id = cd.contract_id
    WHERE cd.file_path = storage.objects.name
    AND c.company_id = get_user_company(auth.uid())
  )
);

-- Policy: Users can delete documents in their company
CREATE POLICY "Users can delete contract documents in their company"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'contract-documents' AND
  EXISTS (
    SELECT 1
    FROM contract_documents cd
    JOIN contracts c ON c.id = cd.contract_id
    WHERE cd.file_path = storage.objects.name
    AND c.company_id = get_user_company(auth.uid())
  )
);
