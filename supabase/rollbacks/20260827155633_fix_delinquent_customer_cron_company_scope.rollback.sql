BEGIN;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'update-delinquent-customers';

SELECT cron.schedule(
  'update-delinquent-customers',
  '0 9 * * *',
  $$SELECT update_delinquent_customers()$$
);

COMMIT;
