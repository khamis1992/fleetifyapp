
-- Drop existing policies on company_legal_documents
DROP POLICY IF EXISTS "company_legal_documents_insert_policy" ON company_legal_documents;
DROP POLICY IF EXISTS "company_legal_documents_select_policy" ON company_legal_documents;
DROP POLICY IF EXISTS "company_legal_documents_update_policy" ON company_legal_documents;
DROP POLICY IF EXISTS "company_legal_documents_delete_policy" ON company_legal_documents;

-- Create simple permissive policies for authenticated users
CREATE POLICY "legal_docs_insert"
ON company_legal_documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "legal_docs_select"
ON company_legal_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "legal_docs_update"
ON company_legal_documents FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "legal_docs_delete"
ON company_legal_documents FOR DELETE
TO authenticated
USING (true);
;
