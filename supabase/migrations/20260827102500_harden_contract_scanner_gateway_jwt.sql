-- Require both Supabase gateway JWT verification and the dedicated scheduled
-- agent identity for the contract scanner cron invocation.

BEGIN;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'
  ) THEN
    RAISE EXCEPTION 'supabase_anon_key is required in Vault before scheduling the scanner';
  END IF;
END;
$block$;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'nightly-contract-terms-scan';

SELECT cron.schedule(
  'nightly-contract-terms-scan',
  '10 3 * * *',
  $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/contract-terms-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1),
      'x-agent-id', 'contract-terms-scanner',
      'x-agent-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agent_secret_contract_terms_scanner' LIMIT 1)
    ),
    body := jsonb_build_object(
      'mode', 'batch',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'maxDocuments', 10,
      'autoApply', false
    ),
    timeout_milliseconds := 120000
  );
  $command$
);

COMMIT;
