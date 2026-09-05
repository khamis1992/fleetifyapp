-- Restore the deployed command bodies; preserve preparation rows and audit history.
BEGIN;
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

  UPDATE public.taqadi_filing_jobs
  SET
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

  UPDATE public.taqadi_filing_jobs
  SET
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
