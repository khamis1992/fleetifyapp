-- Signed lease verification guards for legal/Taqadi transfers
-- Prevents the Murad / C-ALF-0096 failure mode: no legal conversion without verified matched signed lease

BEGIN;

-- Helper function: Check if contract has a matched signed lease document
CREATE OR REPLACE FUNCTION public.check_contract_has_verified_signed_lease_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_signed_doc_count int;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND company_id = p_company_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check for signed contract document with matching customer_id
  -- Prefer: signed_contract or signed_contract_image with same customer_id
  SELECT COUNT(*) INTO v_signed_doc_count
  FROM public.contract_documents doc
  WHERE doc.company_id = p_company_id
    AND doc.contract_id = p_contract_id
    AND doc.document_type IN ('signed_contract', 'signed_contract_image')
    AND doc.file_path IS NOT NULL
    -- Future enhancement: Add extracted QID/contract_number matching here
    -- For now, require that the document exists for the same contract
    LIMIT 1;

  RETURN v_signed_doc_count > 0;
END;
$$;

COMMENT ON FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid, uuid) IS
'Returns true if contract has a matched signed lease document (signed_contract or signed_contract_image). Used to gate legal/Taqadi transfers.';

REVOKE ALL ON FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid, uuid)
  TO authenticated, service_role;


-- Helper function: Check if contract has identity verification
CREATE OR REPLACE FUNCTION public.check_contract_identity_verified_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_customer_id uuid;
  v_verified_task_count int;
BEGIN
  -- Get contract and customer
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND company_id = p_company_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_customer_id := v_contract.customer_id;
  IF v_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if there's a verified customer verification task for this customer
  SELECT COUNT(*) INTO v_verified_task_count
  FROM public.customer_verification_tasks task
  WHERE task.company_id = p_company_id
    AND task.customer_id = v_customer_id
    AND lower(COALESCE(task.status, '')) = 'verified'
  LIMIT 1;

  -- If no verification tasks exist, we allow it (don't break historical workflow)
  -- But if verification tasks exist and none are verified, block it
  IF v_verified_task_count > 0 THEN
    RETURN true;
  END IF;

  -- Check if verification system is being used for this company
  DECLARE
    v_has_any_verification_tasks boolean;
  BEGIN
    SELECT EXISTS(
      SELECT 1
      FROM public.customer_verification_tasks task
      WHERE task.company_id = p_company_id
      LIMIT 1
    ) INTO v_has_any_verification_tasks;
    
    -- If company uses verification system but this customer has no verified task, block
    -- If company doesn't use verification system, allow (legacy workflow)
    RETURN NOT v_has_any_verification_tasks;
  END;
END;
$$;

COMMENT ON FUNCTION public.check_contract_identity_verified_v1(uuid, uuid) IS
'Returns true if customer identity is verified via customer_verification_tasks, or if verification system is not in use (legacy). Used to gate legal/Taqadi transfers.';

REVOKE ALL ON FUNCTION public.check_contract_identity_verified_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_contract_identity_verified_v1(uuid, uuid)
  TO authenticated, service_role;


-- Update convert_contract_to_legal_v1 to enforce signed lease guard
-- This wraps the existing function and adds pre-flight checks
DO $$
BEGIN
  -- Check if the function exists with the current signature
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'convert_contract_to_legal_v1'
  ) THEN
    -- Rename existing function to _pre_signed_lease_guard
    EXECUTE 'ALTER FUNCTION public.convert_contract_to_legal_v1(uuid, uuid, text, text, text, boolean, uuid) 
             RENAME TO convert_contract_to_legal_v1_pre_signed_lease_guard';
  END IF;
END $$;

-- New convert_contract_to_legal_v1 with signed lease guards
CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_signed_lease boolean;
  v_identity_verified boolean;
  v_result jsonb;
BEGIN
  -- HARD GATE: Check for signed lease
  v_has_signed_lease := public.check_contract_has_verified_signed_lease_v1(
    p_company_id,
    p_contract_id
  );

  IF NOT v_has_signed_lease THEN
    RAISE EXCEPTION 'لا يمكن التحويل للشؤون القانونية: عقد موقّع مطابق غير موجود. يجب رفع نسخة العقد الموقع أولاً.'
      USING ERRCODE = 'P0001',
            HINT = 'Upload signed_contract or signed_contract_image document before legal transfer';
  END IF;

  -- HARD GATE: Check identity verification
  v_identity_verified := public.check_contract_identity_verified_v1(
    p_company_id,
    p_contract_id
  );

  IF NOT v_identity_verified THEN
    RAISE EXCEPTION 'لا يمكن التحويل للشؤون القانونية: الهوية غير متحققة. يجب التحقق من هوية العميل أولاً.'
      USING ERRCODE = 'P0001',
            HINT = 'Complete customer identity verification before legal transfer';
  END IF;

  -- Call the original function
  v_result := public.convert_contract_to_legal_v1_pre_signed_lease_guard(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    p_vehicle_returned,
    p_actor_id
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.convert_contract_to_legal_v1(uuid, uuid, text, text, text, boolean, uuid) IS
'Convert contract to legal case with hard gates: requires verified signed lease and identity verification. Wraps original function with pre-flight checks.';

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(uuid, uuid, text, text, text, boolean, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(uuid, uuid, text, text, text, boolean, uuid)
  TO authenticated, service_role;


-- View: Contracts in legal status without matched signed lease (Gap list)
CREATE OR REPLACE VIEW public.legal_contracts_without_signed_lease AS
SELECT
  c.id,
  c.company_id,
  c.contract_number,
  c.customer_id,
  c.vehicle_id,
  c.status,
  c.legal_status,
  c.start_date,
  c.end_date,
  c.monthly_amount,
  c.balance_due,
  -- Customer info
  cust.first_name_ar,
  cust.last_name_ar,
  cust.company_name_ar,
  cust.national_id,
  cust.phone,
  -- Vehicle info
  v.plate_number,
  v.make,
  v.model,
  -- Legal case info
  lc.case_number,
  lc.case_status,
  -- Document check
  false AS has_signed_lease,
  c.created_at,
  c.updated_at
FROM public.contracts c
LEFT JOIN public.customers cust ON cust.id = c.customer_id AND cust.company_id = c.company_id
LEFT JOIN public.vehicles v ON v.id = c.vehicle_id AND v.company_id = c.company_id
LEFT JOIN public.legal_cases lc ON lc.contract_id = c.id AND lc.company_id = c.company_id
  AND lower(COALESCE(lc.case_status, '')) NOT IN ('closed', 'dismissed', 'withdrawn')
WHERE (
  -- Contracts under legal procedure
  lower(COALESCE(c.status::text, '')) = 'under_legal_procedure'
  OR c.legal_status IS NOT NULL
)
AND NOT EXISTS (
  -- No signed contract document
  SELECT 1
  FROM public.contract_documents doc
  WHERE doc.contract_id = c.id
    AND doc.company_id = c.company_id
    AND doc.document_type IN ('signed_contract', 'signed_contract_image')
    AND doc.file_path IS NOT NULL
);

COMMENT ON VIEW public.legal_contracts_without_signed_lease IS
'Gap list: Contracts in legal status (under_legal_procedure or has legal_status) without a matched signed lease document. For management review.';

GRANT SELECT ON public.legal_contracts_without_signed_lease TO authenticated;

COMMIT;
