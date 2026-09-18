-- Short cutover gate: pause every cron that still presents the former shared
-- scanner secret. Deploy the hardened Edge Functions after this migration,
-- then apply 20260827101000 to install identities and recreate the schedules.

BEGIN;

DO $pause$
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
      AND active = true
  LOOP
    PERFORM cron.alter_job(job_id := v_job.jobid, active := false);
  END LOOP;
END;
$pause$;

COMMIT;

;
