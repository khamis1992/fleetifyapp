-- Keep the versioned system audit orchestrator as the only scheduled writer
-- for cross-domain contract/invoice/payment repair work. The legacy functions
-- remain deployed for manual rollback/forensics; only their cron jobs pause.

BEGIN;

DO $retire$
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
      AND active = true
  LOOP
    PERFORM cron.alter_job(job_id := v_job.jobid, active := false);
  END LOOP;
END;
$retire$;

COMMIT;

;
