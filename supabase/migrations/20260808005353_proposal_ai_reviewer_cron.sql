-- Automatic AI review of newly created customer-data proposals every 15
-- minutes, so reviewers find proposals already triaged. Uses the same Vault
-- secret as the contract scanner.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

SELECT cron.unschedule('customer-proposal-ai-reviewer')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'customer-proposal-ai-reviewer'
);

SELECT cron.schedule(
  'customer-proposal-ai-reviewer',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/customer-proposal-ai-reviewer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reviewer-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_scanner_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object(
      'mode', 'batch',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'limit', 25
    )
  );
  $$
);
