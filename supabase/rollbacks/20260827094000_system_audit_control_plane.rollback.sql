-- Roll back the control plane while preserving historical runs/jobs/findings.

BEGIN;

DROP TRIGGER IF EXISTS trg_system_agent_prepare_job_v1 ON public.system_agent_jobs;

DROP FUNCTION IF EXISTS public.system_agent_prepare_job_v1();
DROP FUNCTION IF EXISTS public.system_agent_get_company_control_v1(uuid);
DROP FUNCTION IF EXISTS public.system_agent_set_company_control_v1(uuid,boolean,boolean,boolean,text,uuid,uuid);
DROP FUNCTION IF EXISTS public.system_agent_request_cancel_v1(uuid,uuid,uuid,text);
DROP FUNCTION IF EXISTS public.system_agent_get_job_execution_control_v1(uuid,uuid);
DROP FUNCTION IF EXISTS public.system_agent_cancel_claimed_job_v1(uuid,uuid,text);

CREATE OR REPLACE FUNCTION public.system_agent_claim_job(
  p_job_id uuid,
  p_lease_seconds integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token uuid := gen_random_uuid();
  v_job public.system_agent_jobs%ROWTYPE;
BEGIN
  UPDATE public.system_agent_jobs
  SET status = 'running',
      lease_token = v_token,
      lease_expires_at = now() + make_interval(secs => LEAST(300, GREATEST(30, p_lease_seconds))),
      heartbeat_at = now(),
      started_at = COALESCE(started_at, now()),
      processed_batches = processed_batches + 1,
      updated_at = now()
  WHERE id = p_job_id
    AND attempts < max_attempts
    AND (
      (status IN ('queued', 'retry') AND next_attempt_at <= now())
      OR (status = 'running' AND lease_expires_at < now())
    )
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN to_jsonb(v_job);
END;
$function$;

CREATE OR REPLACE FUNCTION public.system_agent_refresh_run(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
  v_completed integer;
  v_failed integer;
  v_active integer;
  v_status text;
  v_summary jsonb;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'completed'),
    count(*) FILTER (WHERE status = 'failed'),
    count(*) FILTER (WHERE status IN ('queued', 'running', 'retry'))
  INTO v_total, v_completed, v_failed, v_active
  FROM public.system_agent_jobs
  WHERE run_id = p_run_id;

  v_status := CASE
    WHEN v_active > 0 THEN 'running'
    WHEN v_failed = 0 AND v_completed = v_total THEN 'completed'
    WHEN v_completed > 0 THEN 'partial'
    ELSE 'failed'
  END;

  SELECT jsonb_build_object(
    'jobs', jsonb_build_object('total', v_total, 'completed', v_completed, 'failed', v_failed, 'active', v_active),
    'findings', jsonb_build_object(
      'total', count(*),
      'repaired', count(*) FILTER (WHERE status = 'repaired'),
      'review', count(*) FILTER (WHERE status = 'review'),
      'failed', count(*) FILTER (WHERE status = 'failed'),
      'planned', count(*) FILTER (WHERE status IN ('detected', 'planned'))
    )
  ) INTO v_summary
  FROM public.system_agent_findings
  WHERE run_id = p_run_id;

  UPDATE public.system_agent_runs
  SET status = v_status,
      summary = v_summary,
      finished_at = CASE WHEN v_active = 0 THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_run_id;

  RETURN jsonb_build_object('status', v_status, 'summary', v_summary);
END;
$function$;

CREATE OR REPLACE FUNCTION public.system_agent_finish_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_has_more boolean DEFAULT false,
  p_cursor jsonb DEFAULT '{}'::jsonb,
  p_stats jsonb DEFAULT '{}'::jsonb,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
BEGIN
  UPDATE public.system_agent_jobs
  SET status = CASE
        WHEN p_success AND p_has_more THEN 'queued'
        WHEN p_success THEN 'completed'
        WHEN attempts + 1 < max_attempts THEN 'retry'
        ELSE 'failed'
      END,
      attempts = CASE WHEN p_success THEN attempts ELSE attempts + 1 END,
      cursor = COALESCE(p_cursor, cursor),
      stats = COALESCE(p_stats, stats),
      last_error = CASE WHEN p_success THEN NULL ELSE left(COALESCE(p_error, 'Unknown worker failure'), 4000) END,
      next_attempt_at = CASE WHEN p_success THEN now() ELSE now() + interval '30 seconds' END,
      finished_at = CASE WHEN p_success AND NOT p_has_more THEN now() WHEN NOT p_success AND attempts + 1 >= max_attempts THEN now() ELSE NULL END,
      lease_token = NULL,
      lease_expires_at = NULL,
      heartbeat_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND lease_token = p_lease_token
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'System agent job lease is no longer valid';
  END IF;

  PERFORM public.system_agent_refresh_run(v_job.run_id);
  RETURN to_jsonb(v_job);
END;
$function$;

REVOKE ALL ON FUNCTION public.system_agent_claim_job(uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_refresh_run(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_finish_job(uuid,uuid,boolean,boolean,jsonb,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_claim_job(uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_refresh_run(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_finish_job(uuid,uuid,boolean,boolean,jsonb,jsonb,text) TO service_role;

ALTER TABLE public.system_agent_jobs
  DROP CONSTRAINT IF EXISTS system_agent_jobs_owner_profile_id_fkey,
  DROP COLUMN IF EXISTS owner_profile_id,
  DROP COLUMN IF EXISTS cancel_requested_at,
  DROP COLUMN IF EXISTS cancel_requested_by_user_id,
  DROP COLUMN IF EXISTS cancel_reason,
  DROP COLUMN IF EXISTS cancelled_at;

DROP TABLE IF EXISTS public.system_agent_control_events;
DROP TABLE IF EXISTS public.system_agent_controls;

COMMIT;
