-- A completed portal submission means the case has been filed, but the court
-- has not accepted it yet. Persist both workflow facts atomically:
-- preparation -> filed -> awaiting_acceptance.
CREATE OR REPLACE FUNCTION public.complete_taqadi_filing_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_case_number text,
  p_reference_number text,
  p_court_fees numeric DEFAULT NULL,
  p_result jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_reference text := COALESCE(
    NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_case_number, '')), '')
  );
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only a trusted automation worker may complete filing jobs'
      USING ERRCODE = '42501';
  END IF;
  IF v_reference IS NULL THEN
    RAISE EXCEPTION 'A Taqadi case or reference number is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.id = p_job_id
    AND job.locked_by = BTRIM(p_worker_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Filing job lock was lost' USING ERRCODE = 'P0001';
  END IF;
  IF v_job.status = 'filed' THEN
    RETURN to_jsonb(v_job);
  END IF;
  IF v_job.status <> 'submitting' THEN
    RAISE EXCEPTION 'The filing job is not at the submission step'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = v_job.legal_case_id
    AND legal_case.company_id = v_job.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal case was not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_case.workflow_stage NOT IN ('preparation', 'filed', 'awaiting_acceptance') THEN
    RAISE EXCEPTION 'Legal case is no longer at a filing stage'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_case.workflow_stage = 'preparation' THEN
    PERFORM public.transition_legal_case_workflow_v1(
      v_job.company_id,
      v_job.legal_case_id,
      'filed',
      'تم إيداع الدعوى آليًا في نظام تقاضي',
      v_job.requested_by
    );
  END IF;

  UPDATE public.legal_cases
  SET
    case_reference = v_reference,
    court_fees = COALESCE(p_court_fees, court_fees),
    filing_date = COALESCE(filing_date, CURRENT_DATE),
    updated_at = now()
  WHERE id = v_job.legal_case_id
    AND company_id = v_job.company_id;

  SELECT *
  INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.id = v_job.legal_case_id
    AND legal_case.company_id = v_job.company_id
  FOR UPDATE;

  IF v_case.workflow_stage = 'filed' THEN
    PERFORM public.transition_legal_case_workflow_v1(
      v_job.company_id,
      v_job.legal_case_id,
      'awaiting_acceptance',
      'تم تأكيد إيداع الدعوى في تقاضي؛ بانتظار قبول المحكمة',
      v_job.requested_by
    );
  END IF;

  UPDATE public.lawsuit_preparations
  SET
    status = 'registered',
    taqadi_case_number = COALESCE(
      NULLIF(BTRIM(COALESCE(p_case_number, '')), ''),
      taqadi_case_number
    ),
    taqadi_reference_number = v_reference,
    submitted_at = COALESCE(submitted_at, now()),
    registered_at = COALESCE(registered_at, now()),
    updated_at = now()
  WHERE company_id = v_job.company_id
    AND (
      legal_case_id = v_job.legal_case_id
      OR contract_id = v_job.contract_id
    );

  UPDATE public.taqadi_filing_jobs
  SET
    status = 'filed',
    current_step = 'completed',
    progress = 100,
    result = COALESCE(p_result, '{}'::jsonb) || jsonb_build_object(
      'caseNumber', NULLIF(BTRIM(COALESCE(p_case_number, '')), ''),
      'referenceNumber', v_reference,
      'courtFees', p_court_fees,
      'filedAt', now(),
      'legalWorkflowStage', 'awaiting_acceptance'
    ),
    error_code = NULL,
    error_message = NULL,
    heartbeat_at = now(),
    completed_at = now(),
    updated_at = now()
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  INSERT INTO public.taqadi_filing_job_events (
    company_id, job_id, event_type, step, status, message, details
  ) VALUES (
    v_job.company_id, v_job.id, 'filed', 'completed', 'filed',
    'تم إيداع الدعوى في تقاضي ونقلها إلى انتظار قبول المحكمة',
    v_job.result
  );

  UPDATE public.taqadi_automation_workers
  SET
    status = 'idle',
    current_job_id = NULL,
    heartbeat_at = now(),
    last_error = NULL
  WHERE worker_id = BTRIM(p_worker_id);

  RETURN to_jsonb(v_job);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_taqadi_filing_job_v1(uuid, text, text, text, numeric, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_taqadi_filing_job_v1(uuid, text, text, text, numeric, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.complete_taqadi_filing_job_v1(uuid, text, text, text, numeric, jsonb) IS
  'Completes a proven Taqadi submission and moves the legal case to awaiting court acceptance.';
