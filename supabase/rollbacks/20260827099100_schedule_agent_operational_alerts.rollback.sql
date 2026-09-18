BEGIN;

SELECT cron.unschedule(job.jobname)
FROM cron.job job
WHERE job.jobname = 'agent-operational-alerts-v1';

COMMIT;
