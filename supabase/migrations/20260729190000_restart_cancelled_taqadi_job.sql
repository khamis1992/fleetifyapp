-- Cancelling a filing is an explicit stop. If the user later starts it again,
-- create a fresh attempt cycle even when the previous cycle reached its limit.
CREATE OR REPLACE FUNCTION public.retry_taqadi_filing_job_v1(
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
  v_attempts_reset boolean := false;
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
    RAISE EXCEPTION 'Only stopped filing jobs can be retried' USING ERRCODE = 'P0001';
  END IF;
  IF v_job.error_code = 'SUBMISSION_UNCERTAIN' THEN
    RAISE EXCEPTION 'Submission result must be verified in Taqadi before retrying'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_job.attempt_count >= v_job.max_attempts AND v_job.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Maximum filing attempts reached' USING ERRCODE = 'P0001';
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
  v_attempts_reset := v_previous_status = 'cancelled'
    AND v_job.attempt_count >= v_job.max_attempts;

  UPDATE public.taqadi_filing_jobs
  SET
    status = 'queued',
    current_step = 'queued',
    progress = 0,
    attempt_count = CASE
      WHEN v_previous_status = 'cancelled' THEN 0
      ELSE attempt_count
    END,
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
    'تمت إعادة الدعوى إلى طابور الرفع من البداية',
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'attemptsReset', v_attempts_reset,
      'attemptCount', v_job.attempt_count
    )
  );

  RETURN to_jsonb(v_job);
END;
$$;

REVOKE ALL ON FUNCTION public.retry_taqadi_filing_job_v1(uuid, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_taqadi_filing_job_v1(uuid, uuid)
  TO authenticated;

