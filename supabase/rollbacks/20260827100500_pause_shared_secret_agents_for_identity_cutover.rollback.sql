-- Production preflight confirmed these seven schedules were active before the
-- cutover gate. Reactivate them only if the identity activation was not run.

BEGIN;

DO $resume$
DECLARE
  v_job record;
BEGIN
  FOR v_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'violation-inbox-processor',
      'nightly-ops-auditor',
      'smart-contract-assigner',
      'customer-duplicate-detector',
      'contract-id-scanner',
      'customer-proposal-ai-reviewer',
      'nightly-contract-terms-scan'
    )
      AND active = false
  LOOP
    PERFORM cron.alter_job(job_id := v_job.jobid, active := true);
  END LOOP;
END;
$resume$;

COMMIT;
