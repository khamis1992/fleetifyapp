BEGIN;

-- Record the signed-contract clause that was omitted from the legal profile for
-- C-ALF-0041. The correction is deliberately fail-closed: it only touches the
-- exact company/contract/profile and the sole active identity-matched lease.
DO $migration$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id CONSTANT UUID := '4fcdae07-20f2-4bad-ba1c-e3de57df2a6d';
  v_contract_number CONSTANT TEXT := 'C-ALF-0041';
  v_clause_number CONSTANT TEXT := '13.3';
  v_clause_text CONSTANT TEXT := 'في حال مخالفة الطرف الثاني لأي من بنود هذا العقد يحق للطرف الأول إنهاء العقد دون الحاجة إلى إنذار أو إخطار من قبل الطرف الأول، كما يترتب على الطرف الثاني غرامة 2000 ريال في حال إلغاء العقد بسبب مخالفته لأحد البنود.';
  v_contract_count INTEGER;
  v_profile public.legal_case_litigation_profile%ROWTYPE;
  v_document_count INTEGER;
  v_signed_contract_document_id UUID;
  v_breakdown JSONB;
BEGIN
  SELECT COUNT(*)
    INTO v_contract_count
  FROM public.contracts contract
  WHERE contract.company_id = v_company_id
    AND contract.id = v_contract_id
    AND contract.contract_number = v_contract_number;

  IF v_contract_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one % contract in the approved company, found %',
      v_contract_number, v_contract_count;
  END IF;

  SELECT profile.*
    INTO v_profile
  FROM public.legal_case_litigation_profile profile
  WHERE profile.company_id = v_company_id
    AND profile.contract_id = v_contract_id
  FOR UPDATE;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Litigation profile for % is missing', v_contract_number;
  END IF;

  IF v_profile.contractual_compensation_enabled
     OR v_profile.contractual_compensation_clause_number IS NOT NULL
     OR v_profile.contractual_compensation_clause_text IS NOT NULL
     OR v_profile.contractual_compensation_method IS NOT NULL
     OR v_profile.contractual_compensation_rate IS NOT NULL
     OR v_profile.contractual_compensation_cap IS NOT NULL
     OR v_profile.contractual_compensation_document_id IS NOT NULL THEN
    RAISE EXCEPTION 'Contractual-compensation data for % is no longer empty; manual review required',
      v_contract_number;
  END IF;

  SELECT COUNT(*), (ARRAY_AGG(document.id ORDER BY document.created_at DESC, document.id))[1]
    INTO v_document_count, v_signed_contract_document_id
  FROM public.contract_documents document
  WHERE document.company_id = v_company_id
    AND document.contract_id = v_contract_id
    AND document.document_type IN ('signed_contract', 'signed_contract_image')
    AND document.file_path IS NOT NULL
    AND document.legal_identity_match_status = 'matched'
    AND document.legal_evidence_state = 'active';

  IF v_document_count <> 1 OR v_signed_contract_document_id IS NULL THEN
    RAISE EXCEPTION 'Expected one active identity-matched signed contract for %, found %',
      v_contract_number, v_document_count;
  END IF;

  UPDATE public.legal_case_litigation_profile profile
  SET contractual_compensation_enabled = TRUE,
      contractual_compensation_clause_number = v_clause_number,
      contractual_compensation_clause_text = v_clause_text,
      contractual_compensation_method = 'fixed',
      contractual_compensation_rate = 2000,
      contractual_compensation_cap = 2000,
      contractual_compensation_document_id = v_signed_contract_document_id
  WHERE profile.id = v_profile.id
    AND profile.company_id = v_company_id
    AND profile.contract_id = v_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contractual-compensation correction for % was not applied', v_contract_number;
  END IF;

  SELECT public.calculate_legal_claim_breakdown_v2(
    v_company_id,
    v_contract_id,
    ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE)
  ) INTO v_breakdown;

  IF COALESCE((v_breakdown ->> 'contractual_compensation_amount')::NUMERIC, 0) <> 2000 THEN
    RAISE EXCEPTION 'Expected QAR 2,000 contractual compensation for %, breakdown was %',
      v_contract_number, v_breakdown;
  END IF;
END;
$migration$;

COMMIT;
