BEGIN;

SELECT cron.unschedule(job.jobname)
FROM cron.job job
WHERE job.jobname = 'agent-operational-alerts-v1';

SELECT cron.schedule(
  'agent-operational-alerts-v1',
  '*/10 * * * *',
  $$SELECT public.sync_agent_operational_alerts_v1('24bc0b21-4e2d-4413-9842-31719a3669f4');$$
);

COMMIT;

;
