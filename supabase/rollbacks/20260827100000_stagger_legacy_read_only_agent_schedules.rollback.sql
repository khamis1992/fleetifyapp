-- Restore the former 02:30 UTC schedule.

BEGIN;

DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'daily-legal-workflow-guard-v1';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'daily-legal-workflow-guard-v1',
    '30 2 * * *',
    $command$SELECT public.run_legal_workflow_daily_guard_v1();$command$
  );
END;
$schedule$;

COMMIT;
