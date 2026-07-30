-- Restore the previous retry implementation.
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
  IF v_job.attempt_count >= v_job.max_attempts THEN
    RAISE EXCEPTION 'Maximum filing attempts reached' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.taqadi_filing_jobs
  SET
    status = 'queued',
    current_step = 'queued',
    progress = 0,
    error_code = NULL,
    error_message = NULL,
    locked_by = NULL,
    locked_at = NULL,
    heartbeat_at = NULL,
    completed_at = NULL,
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  RETURN to_jsonb(v_job);
END;
$$;
