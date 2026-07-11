-- Schedule the Daily Audit Agent.
-- Requires pg_cron and pg_net to be enabled.
-- Requires a Vault secret named audit_agent_secret containing the same value as
-- the Edge Function secret AUDIT_AGENT_SECRET.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

SELECT cron.unschedule('daily-audit-agent')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-audit-agent'
);

SELECT cron.schedule(
  'daily-audit-agent',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/daily-audit-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'audit_agent_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object(
      'dryRun', false,
      'maxCompanies', 20,
      'maxContractsPerCompany', 120,
      'maxInvoicesPerCompany', 1000,
      'maxJournalRepairBatch', 250,
      'includeAiSummary', true
    )
  );
  $$
);
