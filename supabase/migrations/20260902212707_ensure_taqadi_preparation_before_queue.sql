-- Queue creation must persist the preparation snapshot that the filing guard
-- references. The preparation UI is generated from live state and historically
-- did not create a lawsuit_preparations row, causing every first queue attempt
-- to fail with TAQADI_LAWSUIT_PREPARATION_LINK_REQUIRED.

BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_taqadi_filing_job_v1(
  p_company_id uuid,
  p_legal_case_id uuid,
  p_payload jsonb,
  p_idempotency_key text,
  p_final_approval boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_case public.legal_cases%ROWTYPE;
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_validation jsonb;
  v_actor uuid := auth.uid();
  v_preparation_id uuid;
  v_source_document_id uuid;
  v_customer_id uuid;
  v_claim_amount numeric;
  v_contract_url text;
  v_memo_url text;
  v_claims_url text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(pg_catalog.btrim(COALESCE(p_idempotency_key, '')), '') IS NULL THEN
    RAISE EXCEPTION 'An idempotency key is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = p_legal_case_id
    AND legal_case.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND OR v_case.contract_id IS NULL THEN
    RAISE EXCEPTION 'Legal case or its contract was not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_case.workflow_stage <> 'preparation' THEN
    RAISE EXCEPTION 'Only cases in preparation can be queued for filing'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(pg_catalog.btrim(COALESCE(v_case.case_reference, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'The case already has a Taqadi reference'
      USING ERRCODE = 'P0001';
  END IF;

  v_validation := public.validate_taqadi_filing_payload_v1(
    p_company_id,
    v_case.contract_id,
    p_payload
  );
  IF COALESCE((v_validation ->> 'ready')::boolean, false) = false THEN
    RAISE EXCEPTION 'Filing package is incomplete: %', v_validation -> 'missing'
      USING ERRCODE = 'P0001';
  END IF;

  -- Preserve the original idempotent behavior without rewriting a frozen
  -- preparation when the same command is submitted again.
  SELECT *
  INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.company_id = p_company_id
    AND job.idempotency_key = pg_catalog.btrim(p_idempotency_key)
  LIMIT 1;

  IF FOUND THEN
    RETURN pg_catalog.to_jsonb(v_job);
  END IF;

  SELECT *
  INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.company_id = p_company_id
    AND job.legal_case_id = p_legal_case_id
    AND job.status NOT IN ('filed', 'failed', 'cancelled')
  ORDER BY job.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN pg_catalog.to_jsonb(v_job);
  END IF;

  SELECT
    CASE
      WHEN COALESCE(document ->> 'sourceDocumentId', '')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (document ->> 'sourceDocumentId')::uuid
      ELSE NULL
    END,
    NULLIF(document ->> 'url', '')
  INTO v_source_document_id, v_contract_url
  FROM pg_catalog.jsonb_array_elements(COALESCE(p_payload -> 'documents', '[]'::jsonb)) document
  WHERE document ->> 'key' = 'contract'
  LIMIT 1;

  SELECT NULLIF(document ->> 'url', '')
  INTO v_memo_url
  FROM pg_catalog.jsonb_array_elements(COALESCE(p_payload -> 'documents', '[]'::jsonb)) document
  WHERE document ->> 'key' = 'memo'
  LIMIT 1;

  SELECT NULLIF(document ->> 'url', '')
  INTO v_claims_url
  FROM pg_catalog.jsonb_array_elements(COALESCE(p_payload -> 'documents', '[]'::jsonb)) document
  WHERE document ->> 'key' = 'claims'
  LIMIT 1;

  IF v_source_document_id IS NULL THEN
    RAISE EXCEPTION 'TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED'
      USING ERRCODE = '23514';
  END IF;

  SELECT contract.customer_id
  INTO v_customer_id
  FROM public.contracts contract
  WHERE contract.id = v_case.contract_id
    AND contract.company_id = p_company_id;

  v_claim_amount := GREATEST(
    COALESCE(NULLIF(p_payload #>> '{case,amount}', '')::numeric, 0),
    0
  );

  SELECT preparation.id
  INTO v_preparation_id
  FROM public.lawsuit_preparations preparation
  WHERE preparation.company_id = p_company_id
    AND preparation.contract_id = v_case.contract_id
    AND preparation.legal_case_id = p_legal_case_id
  ORDER BY preparation.updated_at DESC NULLS LAST,
           preparation.created_at DESC NULLS LAST,
           preparation.id DESC
  LIMIT 1;

  IF v_preparation_id IS NULL THEN
    INSERT INTO public.lawsuit_preparations (
      company_id,
      contract_id,
      customer_id,
      defendant_name,
      defendant_id_number,
      defendant_type,
      overdue_rent,
      late_fees,
      other_fees,
      total_amount,
      amount_in_words,
      case_title,
      facts_text,
      claims_text,
      explanatory_memo_url,
      claims_statement_url,
      contract_copy_url,
      status,
      prepared_at,
      prepared_by,
      legal_case_id,
      source_document_id
    ) VALUES (
      p_company_id,
      v_case.contract_id,
      v_customer_id,
      p_payload #>> '{defendant,fullName}',
      NULLIF(p_payload #>> '{defendant,idNumber}', ''),
      'natural_person',
      0,
      0,
      0,
      v_claim_amount,
      NULLIF(p_payload #>> '{case,amountInWords}', ''),
      NULLIF(p_payload #>> '{case,title}', ''),
      NULLIF(p_payload #>> '{case,facts}', ''),
      NULLIF(p_payload #>> '{case,claims}', ''),
      v_memo_url,
      v_claims_url,
      v_contract_url,
      'prepared',
      pg_catalog.now(),
      v_actor,
      p_legal_case_id,
      v_source_document_id
    )
    RETURNING id INTO v_preparation_id;
  ELSE
    UPDATE public.lawsuit_preparations preparation
    SET customer_id = v_customer_id,
        defendant_name = p_payload #>> '{defendant,fullName}',
        defendant_id_number = NULLIF(p_payload #>> '{defendant,idNumber}', ''),
        total_amount = v_claim_amount,
        amount_in_words = NULLIF(p_payload #>> '{case,amountInWords}', ''),
        case_title = NULLIF(p_payload #>> '{case,title}', ''),
        facts_text = NULLIF(p_payload #>> '{case,facts}', ''),
        claims_text = NULLIF(p_payload #>> '{case,claims}', ''),
        explanatory_memo_url = v_memo_url,
        claims_statement_url = v_claims_url,
        contract_copy_url = v_contract_url,
        status = 'prepared',
        prepared_at = pg_catalog.now(),
        prepared_by = v_actor,
        source_document_id = v_source_document_id,
        updated_at = pg_catalog.now()
    WHERE preparation.id = v_preparation_id
      AND preparation.company_id = p_company_id
      AND preparation.contract_id = v_case.contract_id
      AND preparation.legal_case_id = p_legal_case_id;
  END IF;

  INSERT INTO public.taqadi_filing_jobs (
    company_id,
    legal_case_id,
    contract_id,
    payload,
    idempotency_key,
    final_approval,
    requested_by,
    lawsuit_preparation_id,
    source_document_id
  ) VALUES (
    p_company_id,
    p_legal_case_id,
    v_case.contract_id,
    p_payload || pg_catalog.jsonb_build_object(
      'validation', v_validation,
      'queuedAt', pg_catalog.now(),
      'legalCaseNumber', v_case.case_number
    ),
    pg_catalog.btrim(p_idempotency_key),
    COALESCE(p_final_approval, true),
    v_actor,
    v_preparation_id,
    v_source_document_id
  )
  RETURNING * INTO v_job;

  INSERT INTO public.taqadi_filing_job_events (
    company_id, job_id, event_type, step, status, message, details
  ) VALUES (
    p_company_id,
    v_job.id,
    'queued',
    'queued',
    'queued',
    'تمت إضافة الدعوى إلى طابور الرفع في تقاضي',
    v_validation
  );

  RETURN pg_catalog.to_jsonb(v_job);
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_taqadi_filing_job_v1(uuid, uuid, jsonb, text, boolean)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_taqadi_filing_job_v1(uuid, uuid, jsonb, text, boolean)
TO authenticated, service_role;

COMMENT ON FUNCTION public.enqueue_taqadi_filing_job_v1(uuid, uuid, jsonb, text, boolean) IS
  'Atomically freezes/refreshes the lawsuit preparation and its direct signed-contract evidence before queueing a Taqadi filing job.';

COMMIT;
