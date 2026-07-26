-- Allow workspace-only employees to upload signed contract scans for contracts
-- that are currently assigned to their own profile.
DROP POLICY IF EXISTS "Assigned employees can upload signed contract scans"
ON public.contract_documents;

CREATE POLICY "Assigned employees can upload signed contract scans"
ON public.contract_documents
FOR INSERT
TO authenticated
WITH CHECK (
  document_type IN ('signed_contract', 'signed_contract_image')
  AND company_id = public.get_user_company(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.contracts c
    JOIN public.profiles p
      ON p.id = c.assigned_to_profile_id
    WHERE c.id = contract_documents.contract_id
      AND c.company_id = contract_documents.company_id
      AND p.user_id = auth.uid()
      AND p.company_id = contract_documents.company_id
  )
);

