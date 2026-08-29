BEGIN;

DROP FUNCTION IF EXISTS public.upsert_contract_reconciliation_review_task_v1(uuid,text,jsonb);
DROP FUNCTION IF EXISTS public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb);
DROP FUNCTION IF EXISTS public.contract_terms_scan_batch_candidates_v3(uuid,integer,uuid);

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
      'x-agent-id', 'contract-terms-scanner',
      'x-agent-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agent_secret_contract_terms_scanner' LIMIT 1)
    ),
    body := jsonb_build_object(
      'mode', 'batch',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'maxDocuments', 4,
      'autoApply', false
    ),
    timeout_milliseconds := 120000
  );
  $command$
);

COMMIT;
