
-- Enable RLS on company_legal_documents
ALTER TABLE company_legal_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert documents for their company
CREATE POLICY "company_legal_documents_insert_policy"
ON company_legal_documents FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to select documents for their company
CREATE POLICY "company_legal_documents_select_policy"
ON company_legal_documents FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update documents for their company
CREATE POLICY "company_legal_documents_update_policy"
ON company_legal_documents FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete documents for their company
CREATE POLICY "company_legal_documents_delete_policy"
ON company_legal_documents FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);
;
