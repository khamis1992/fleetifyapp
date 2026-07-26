DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, uuid
);
DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
);

ALTER FUNCTION public.convert_contract_to_legal_v1_pre_readiness(
  uuid, uuid, text, text, text, boolean, uuid
) RENAME TO convert_contract_to_legal_v1;

CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.convert_contract_to_legal_v1(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    false,
    p_actor_id
  );
$$;

DROP POLICY IF EXISTS "Assigned employees can upload legal readiness documents"
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
    FROM public.contracts contract
    JOIN public.profiles profile
      ON profile.id = contract.assigned_to_profile_id
     AND profile.company_id = contract.company_id
    WHERE contract.id = contract_documents.contract_id
      AND contract.company_id = contract_documents.company_id
      AND profile.user_id = auth.uid()
  )
);

DROP FUNCTION IF EXISTS public.complete_legal_transfer_readiness_v1(
  uuid, uuid, jsonb, uuid
);
DROP FUNCTION IF EXISTS public.legal_transfer_update_invoice_amount_v1(
  uuid, uuid, uuid, numeric, text, uuid
);
DROP FUNCTION IF EXISTS public.get_legal_transfer_readiness_v1(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_prepare_contract_for_legal_v1(uuid, uuid);
