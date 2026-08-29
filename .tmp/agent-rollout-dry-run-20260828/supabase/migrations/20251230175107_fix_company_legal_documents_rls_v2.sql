
-- Drop existing policies
DROP POLICY IF EXISTS "company_legal_documents_insert_policy" ON company_legal_documents;
DROP POLICY IF EXISTS "company_legal_documents_select_policy" ON company_legal_documents;
DROP POLICY IF EXISTS "company_legal_documents_update_policy" ON company_legal_documents;
DROP POLICY IF EXISTS "company_legal_documents_delete_policy" ON company_legal_documents;

-- Create a SECURITY DEFINER function to get company_id safely
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- Create new policies using the SECURITY DEFINER function
CREATE POLICY "company_legal_documents_insert_policy"
ON company_legal_documents FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_legal_documents_select_policy"
ON company_legal_documents FOR SELECT
TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "company_legal_documents_update_policy"
ON company_legal_documents FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_legal_documents_delete_policy"
ON company_legal_documents FOR DELETE
TO authenticated
USING (company_id = get_user_company_id());
;
