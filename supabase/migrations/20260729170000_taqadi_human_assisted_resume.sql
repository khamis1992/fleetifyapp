-- Resume an existing Taqadi browser draft after a user completes a blocked
-- portal step manually. A resume does not consume a new filing attempt.
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
  IF v_job.status NOT IN ('failed', 'needs_human', 'waiting_login') THEN
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
    jsonb_build_object('attemptCountPreserved', v_job.attempt_count)
  );

  RETURN to_jsonb(v_job);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_next_taqadi_filing_job_v1(
  p_worker_id text,
  p_worker_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.taqadi_filing_jobs%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only a trusted automation worker may claim filing jobs'
      USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_worker_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Worker identifier is required' USING ERRCODE = 'P0001';
  END IF;

  WITH candidate AS (
    SELECT job.id
    FROM public.taqadi_filing_jobs job
    WHERE job.status = 'queued'
      AND (
        job.current_step = 'resume_requested'
        OR job.attempt_count < job.max_attempts
      )
    ORDER BY job.created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.taqadi_filing_jobs job
  SET
    status = 'validating',
    current_step = CASE
      WHEN job.current_step = 'resume_requested' THEN 'resume_requested'
      ELSE 'preflight'
    END,
    progress = CASE
      WHEN job.current_step = 'resume_requested' THEN GREATEST(job.progress, 2)
      ELSE 2
    END,
    attempt_count = job.attempt_count + CASE
      WHEN job.current_step = 'resume_requested' THEN 0
      ELSE 1
    END,
    locked_by = BTRIM(p_worker_id),
    locked_at = now(),
    heartbeat_at = now(),
    started_at = COALESCE(job.started_at, now()),
    error_code = NULL,
    error_message = NULL,
    updated_at = now()
  FROM candidate
  WHERE job.id = candidate.id
  RETURNING job.* INTO v_job;

  INSERT INTO public.taqadi_automation_workers (
    worker_id, status, version, current_job_id, heartbeat_at
  )
  VALUES (
    BTRIM(p_worker_id),
    CASE WHEN v_job.id IS NULL THEN 'idle' ELSE 'busy' END,
    COALESCE(NULLIF(BTRIM(p_worker_version), ''), 'unknown'),
    v_job.id,
    now()
  )
  ON CONFLICT (worker_id) DO UPDATE SET
    status = EXCLUDED.status,
    version = EXCLUDED.version,
    current_job_id = EXCLUDED.current_job_id,
    heartbeat_at = now(),
    last_error = NULL;

  IF v_job.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.taqadi_filing_job_events (
    company_id, job_id, event_type, step, status, message, details
  ) VALUES (
    v_job.company_id,
    v_job.id,
    CASE
      WHEN v_job.current_step = 'resume_requested' THEN 'resume_claimed'
      ELSE 'claimed'
    END,
    v_job.current_step,
    'validating',
    CASE
      WHEN v_job.current_step = 'resume_requested'
        THEN 'بدأ الوكيل تحديد صفحة تقاضي المفتوحة لاستكمال الدعوى'
      ELSE 'بدأ وكيل تقاضي معالجة الدعوى'
    END,
    jsonb_build_object(
      'worker_id', p_worker_id,
      'worker_version', p_worker_version,
      'attemptCountPreserved', v_job.current_step = 'resume_requested'
    )
  );

  RETURN to_jsonb(v_job);
END;
$$;

REVOKE ALL ON FUNCTION public.resume_taqadi_filing_job_v1(uuid, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_taqadi_filing_job_v1(uuid, uuid)
  TO authenticated;

