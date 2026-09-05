-- Repair historical stopped jobs using the same preparation snapshot as enqueue.
-- No jobs are queued by this migration. Existing authentication and evidence guards remain.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.refresh_taqadi_filing_job_payload_v1(p_company_id uuid, p_job_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_validation jsonb;
  v_preparation_id uuid;
  v_source_document_id uuid;
  v_customer_id uuid;
  v_claim_amount numeric;
  v_contract_url text;
  v_memo_url text;
  v_claims_url text;
BEGIN
  IF v_actor IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.id = p_job_id
    AND job.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Filing job was not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_job.status NOT IN ('failed', 'needs_human', 'waiting_login', 'cancelled') THEN
    RAISE EXCEPTION 'Only stopped filing jobs can refresh their package'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_job.error_code = 'SUBMISSION_UNCERTAIN' THEN
    RAISE EXCEPTION 'Submission result must be verified in Taqadi before refreshing the package'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = v_job.legal_case_id
    AND legal_case.company_id = p_company_id;

  IF NOT FOUND OR v_case.contract_id IS NULL THEN
    RAISE EXCEPTION 'Legal case or its contract was not found' USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(BTRIM(COALESCE(v_case.case_reference, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'The case already has a Taqadi reference' USING ERRCODE = 'P0001';
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


  -- Repair absent historical links, never an existing link to another case.
  IF v_case.contract_id IS DISTINCT FROM v_job.contract_id THEN
    RAISE EXCEPTION 'TAQADI_CONTRACT_LINK_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF v_job.lawsuit_preparation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lawsuit_preparations p
    WHERE p.id = v_job.lawsuit_preparation_id AND p.company_id = p_company_id
      AND p.contract_id = v_job.contract_id AND p.legal_case_id = v_job.legal_case_id
  ) THEN
    RAISE EXCEPTION 'TAQADI_LAWSUIT_PREPARATION_LINK_REQUIRED' USING ERRCODE = '23514';
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
    AND preparation.legal_case_id = v_case.id
  ORDER BY (preparation.id = v_job.lawsuit_preparation_id) DESC NULLS LAST,
           preparation.updated_at DESC NULLS LAST,
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
      v_case.id,
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
      AND preparation.legal_case_id = v_case.id;
  END IF;


  UPDATE public.taqadi_filing_jobs
  SET
    lawsuit_preparation_id = v_preparation_id,
    source_document_id = v_source_document_id,
    payload = p_payload || jsonb_build_object(
      'validation', v_validation,
      'queuedAt', COALESCE(v_job.payload -> 'queuedAt', to_jsonb(v_job.created_at)),
      'refreshedAt', now(),
      'refreshedBy', v_actor,
      'legalCaseNumber', v_case.case_number
    ),
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  INSERT INTO public.taqadi_filing_job_events (
    company_id,
    job_id,
    event_type,
    step,
    status,
    message,
    details
  ) VALUES (
    p_company_id,
    p_job_id,
    'payload_refreshed',
    'preflight',
    v_job.status,
    'تم تحديث حزمة الدعوى من أحدث بيانات النظام قبل إعادة المحاولة',
    jsonb_build_object(
      'validation', v_validation,
      'refreshedAt', now()
    )
  );

  RETURN to_jsonb(v_job);
END;
$function$;

CREATE OR REPLACE FUNCTION public.restart_taqadi_filing_job_v2(p_company_id uuid, p_job_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_validation jsonb;
  v_preparation_id uuid;
  v_source_document_id uuid;
  v_customer_id uuid;
  v_claim_amount numeric;
  v_contract_url text;
  v_memo_url text;
  v_claims_url text;
  v_previous_status text;
BEGIN
  IF v_actor IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.id = p_job_id
    AND job.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Filing job was not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_job.status NOT IN ('failed', 'needs_human', 'waiting_login', 'cancelled') THEN
    RAISE EXCEPTION 'Only stopped filing jobs can be restarted' USING ERRCODE = 'P0001';
  END IF;
  IF v_job.error_code = 'SUBMISSION_UNCERTAIN' THEN
    RAISE EXCEPTION 'Submission result must be verified in Taqadi before restarting'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_job.attempt_count >= v_job.max_attempts AND v_job.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Maximum filing attempts reached' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = v_job.legal_case_id
    AND legal_case.company_id = p_company_id;

  IF NOT FOUND OR v_case.contract_id IS NULL THEN
    RAISE EXCEPTION 'Legal case or its contract was not found' USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(BTRIM(COALESCE(v_case.case_reference, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'The case already has a Taqadi reference' USING ERRCODE = 'P0001';
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

  v_previous_status := v_job.status;


  -- Repair absent historical links, never an existing link to another case.
  IF v_case.contract_id IS DISTINCT FROM v_job.contract_id THEN
    RAISE EXCEPTION 'TAQADI_CONTRACT_LINK_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF v_job.lawsuit_preparation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lawsuit_preparations p
    WHERE p.id = v_job.lawsuit_preparation_id AND p.company_id = p_company_id
      AND p.contract_id = v_job.contract_id AND p.legal_case_id = v_job.legal_case_id
  ) THEN
    RAISE EXCEPTION 'TAQADI_LAWSUIT_PREPARATION_LINK_REQUIRED' USING ERRCODE = '23514';
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
    AND preparation.legal_case_id = v_case.id
  ORDER BY (preparation.id = v_job.lawsuit_preparation_id) DESC NULLS LAST,
           preparation.updated_at DESC NULLS LAST,
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
      v_case.id,
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
      AND preparation.legal_case_id = v_case.id;
  END IF;


  UPDATE public.taqadi_filing_jobs
  SET
    lawsuit_preparation_id = v_preparation_id,
    source_document_id = v_source_document_id,
    payload = p_payload || jsonb_build_object(
      'validation', v_validation,
      'queuedAt', now(),
      'refreshedAt', now(),
      'refreshedBy', v_actor,
      'legalCaseNumber', v_case.case_number
    ),
    status = 'queued',
    current_step = 'queued',
    progress = 0,
    attempt_count = CASE WHEN v_previous_status = 'cancelled' THEN 0 ELSE attempt_count END,
    error_code = NULL,
    error_message = NULL,
    locked_by = NULL,
    locked_at = NULL,
    heartbeat_at = NULL,
    completed_at = NULL,
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  INSERT INTO public.taqadi_filing_job_events (
    company_id, job_id, event_type, step, status, message, details
  ) VALUES (
    p_company_id,
    p_job_id,
    'retry_requested',
    'queued',
    'queued',
    'تم تحديث حزمة الدعوى وإعادتها إلى طابور الرفع من البداية',
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'payloadRefreshed', true,
      'attemptCount', v_job.attempt_count,
      'validation', v_validation
    )
  );

  RETURN to_jsonb(v_job);
END;
$function$;
COMMIT;
