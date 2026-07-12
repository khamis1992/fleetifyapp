-- Remove the initial system audit schedule without dropping shared extensions.

SELECT cron.unschedule('system-audit-orchestrator')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'system-audit-orchestrator'
);
