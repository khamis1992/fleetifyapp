DROP FUNCTION IF EXISTS public.resume_taqadi_filing_job_v1(uuid, uuid);

-- Restore the original claim behavior. A regular claim always starts at
-- preflight and consumes one attempt.
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

  WITH candidate AS (
    SELECT job.id
    FROM public.taqadi_filing_jobs job
    WHERE job.status = 'queued'
      AND job.attempt_count < job.max_attempts
    ORDER BY job.created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.taqadi_filing_jobs job
  SET
    status = 'validating',
    current_step = 'preflight',
    progress = 2,
    attempt_count = job.attempt_count + 1,
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
    v_job.company_id, v_job.id, 'claimed', 'preflight', 'validating',
    'بدأ وكيل تقاضي معالجة الدعوى',
    jsonb_build_object('worker_id', p_worker_id, 'worker_version', p_worker_version)
  );

  RETURN to_jsonb(v_job);
END;
$$;
