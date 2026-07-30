-- A user may explicitly resume a cancelled draft from the currently open
-- Taqadi page. This remains distinct from retrying the filing from scratch.
CREATE OR REPLACE FUNCTION public.resume_taqadi_filing_job_v1(
  p_company_id uuid,
  p_job_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_previous_status text;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
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
    RAISE EXCEPTION 'Only stopped filing jobs can be resumed' USING ERRCODE = 'P0001';
  END IF;
  IF v_job.error_code = 'SUBMISSION_UNCERTAIN' THEN
    RAISE EXCEPTION 'Submission result must be verified in Taqadi before resuming'
      USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.legal_cases legal_case
    WHERE legal_case.id = v_job.legal_case_id
      AND NULLIF(BTRIM(COALESCE(legal_case.case_reference, '')), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'The case already has a Taqadi reference' USING ERRCODE = 'P0001';
  END IF;

  v_previous_status := v_job.status;

  UPDATE public.taqadi_filing_jobs
  SET
    status = 'queued',
    current_step = 'resume_requested',
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
    'resume_requested',
    'resume_requested',
    'queued',
    'طلب المستخدم المتابعة من صفحة تقاضي المفتوحة',
    jsonb_build_object(
      'attemptCountPreserved', v_job.attempt_count,
      'resumedFromCancelled', v_previous_status = 'cancelled'
    )
  );

  RETURN to_jsonb(v_job);
END;
$$;

REVOKE ALL ON FUNCTION public.resume_taqadi_filing_job_v1(uuid, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_taqadi_filing_job_v1(uuid, uuid)
  TO authenticated;
