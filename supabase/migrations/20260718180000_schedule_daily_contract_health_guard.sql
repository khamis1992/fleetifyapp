CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.invoke_daily_contract_health_guard_v1()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/daily-audit-agent',
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
      'dryRun', false,
      'maxCompanies', 20,
      'maxContractsPerCompany', 500,
      'maxInvoicesPerCompany', 2000,
      'maxJournalRepairBatch', 500,
      'includeAiSummary', false
    )
  );
$$;

REVOKE ALL ON FUNCTION public.invoke_daily_contract_health_guard_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_daily_contract_health_guard_v1() TO service_role;

SELECT cron.unschedule(job.jobname)
FROM cron.job AS job
WHERE job.jobname = 'daily-contract-health-guard-v1';

SELECT cron.schedule(
  'daily-contract-health-guard-v1',
  '15 23 * * *',
  $$SELECT public.invoke_daily_contract_health_guard_v1();$$
);
