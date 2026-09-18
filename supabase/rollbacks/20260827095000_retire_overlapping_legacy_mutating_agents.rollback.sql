-- Restore the two legacy schedules without recreating or changing commands.

BEGIN;

DO $restore$
DECLARE
  v_job record;
BEGIN
  FOR v_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'daily-audit-agent',
      'safe-auto-repair'
    )
      AND active = false
  LOOP
    PERFORM cron.alter_job(job_id := v_job.jobid, active := true);
  END LOOP;
END;
$restore$;

COMMIT;
