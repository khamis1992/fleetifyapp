BEGIN;

-- Restore the previous enqueue implementation. The safety trigger remains in
-- place, so this rollback intentionally restores the pre-fix behavior.
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
SET search_path = public
AS $function$
DECLARE
  v_case public.legal_cases%ROWTYPE;
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_validation jsonb;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_idempotency_key, '')), '') IS NULL THEN
    RAISE EXCEPTION 'An idempotency key is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = p_legal_case_id
    AND legal_case.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND OR v_case.contract_id IS NULL THEN
    RAISE EXCEPTION 'Legal case or its contract was not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_case.workflow_stage <> 'preparation' THEN
    RAISE EXCEPTION 'Only cases in preparation can be queued for filing' USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(BTRIM(COALESCE(v_case.case_reference, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'The case already has a Taqadi reference' USING ERRCODE = 'P0001';
  END IF;

  v_validation := public.validate_taqadi_filing_payload_v1(
    p_company_id, v_case.contract_id, p_payload
  );
  IF COALESCE((v_validation ->> 'ready')::boolean, false) = false THEN
    RAISE EXCEPTION 'Filing package is incomplete: %', v_validation -> 'missing'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.company_id = p_company_id
    AND job.idempotency_key = BTRIM(p_idempotency_key)
  LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(v_job); END IF;

  SELECT * INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.company_id = p_company_id
    AND job.legal_case_id = p_legal_case_id
    AND job.status NOT IN ('filed', 'failed', 'cancelled')
  ORDER BY job.created_at DESC
  LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(v_job); END IF;

  INSERT INTO public.taqadi_filing_jobs (
    company_id, legal_case_id, contract_id, payload, idempotency_key,
    final_approval, requested_by
  ) VALUES (
    p_company_id, p_legal_case_id, v_case.contract_id,
    p_payload || jsonb_build_object(
      'validation', v_validation,
      'queuedAt', now(),
      'legalCaseNumber', v_case.case_number
    ),
    BTRIM(p_idempotency_key), COALESCE(p_final_approval, true), v_actor
  )
  RETURNING * INTO v_job;

  INSERT INTO public.taqadi_filing_job_events (
    company_id, job_id, event_type, step, status, message, details
  ) VALUES (
    p_company_id, v_job.id, 'queued', 'queued', 'queued',
    'تمت إضافة الدعوى إلى طابور الرفع في تقاضي', v_validation
  );

  RETURN to_jsonb(v_job);
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_taqadi_filing_job_v1(uuid, uuid, jsonb, text, boolean)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_taqadi_filing_job_v1(uuid, uuid, jsonb, text, boolean)
TO authenticated, service_role;

COMMIT;
