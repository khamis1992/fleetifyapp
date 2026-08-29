-- Move the daily system audit to the final versioned functions and add hourly recovery.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
SELECT cron.unschedule(job.jobname)
FROM cron.job AS job
WHERE job.jobname IN (
  'daily-audit-agent',
  'system-audit-orchestrator',
  'system-audit-orchestrator-v2',
  'system-audit-orchestrator-v3',
  'system-audit-orchestrator-v3-resume'
);
CREATE OR REPLACE FUNCTION public.invoke_system_audit_orchestrator_v3()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/system-audit-orchestrator-v3',
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
      'idempotencyKey', 'system-audit:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD') ||
        ':all:apply:contracts,accounting,fleet,customers,inventory,legal,employees',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'batchSize', 100,
      'maxCompanies', 20,
      'includeAiTriage', true,
      'resumeStale', true,
      'waitForDispatch', false
    )
  );
$$;
REVOKE ALL ON FUNCTION public.invoke_system_audit_orchestrator_v3() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_system_audit_orchestrator_v3() TO service_role;
SELECT cron.schedule(
  'system-audit-orchestrator-v3',
  '30 0 * * *',
  $$SELECT public.invoke_system_audit_orchestrator_v3();$$
);
SELECT cron.schedule(
  'system-audit-orchestrator-v3-resume',
  '45 * * * *',
  $$SELECT public.invoke_system_audit_orchestrator_v3();$$
);
