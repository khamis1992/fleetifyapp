-- Refresh the immutable filing snapshot only while a job is safely stopped.
-- This lets corrected customer/case data reach the worker without creating a
-- second job or weakening the existing idempotency protection.
CREATE OR REPLACE FUNCTION public.refresh_taqadi_filing_job_payload_v1(
  p_company_id uuid,
  p_job_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.refresh_taqadi_filing_job_payload_v1(uuid, uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_taqadi_filing_job_payload_v1(uuid, uuid, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.refresh_taqadi_filing_job_payload_v1(uuid, uuid, jsonb) IS
  'Replaces a safely stopped Taqadi job snapshot with a newly validated package before retrying it.';
