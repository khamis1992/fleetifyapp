-- Safe rollback: stop future syncs and remove control objects. Existing tasks
-- remain intact because deleting user-facing work during rollback is unsafe.

BEGIN;

DO $rollback$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'system-audit-review-task-sync-v1';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END;
$rollback$;

DROP FUNCTION IF EXISTS public.sync_all_system_audit_review_tasks_v1();
DROP FUNCTION IF EXISTS public.sync_system_audit_review_tasks_v1(uuid);

ALTER TABLE public.system_agent_review_task_links
  DROP COLUMN IF EXISTS last_missing_run_id,
  DROP COLUMN IF EXISTS missed_snapshots;

COMMIT;
