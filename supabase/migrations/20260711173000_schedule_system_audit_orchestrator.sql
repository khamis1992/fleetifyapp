-- Runs the system-wide orchestrator daily at 03:30 Qatar/Saudi time (00:30 UTC).
-- The legacy daily contract agent remains scheduled during the controlled rollout.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

SELECT cron.unschedule('system-audit-orchestrator')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'system-audit-orchestrator');

SELECT cron.schedule(
  'system-audit-orchestrator',
  '30 0 * * *',
  $schedule$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/system-audit-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'audit_agent_secret'
        LIMIT 1
      ), '')
    ),
    body := jsonb_build_object(
      'mode', 'apply',
      'triggerSource', 'cron',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'batchSize', 100,
      'maxCompanies', 20,
      'includeAiTriage', true,
      'resumeStale', true
    )
  );
  $schedule$
);
