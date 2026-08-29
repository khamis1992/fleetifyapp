BEGIN;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname IN (
  'violation-inbox-processor',
  'nightly-ops-auditor',
  'smart-contract-assigner',
  'customer-duplicate-detector',
  'contract-id-scanner',
  'customer-proposal-ai-reviewer',
  'nightly-contract-terms-scan'
);

-- Restore the pre-fix schedules exactly as secret-header-only invocations.
SELECT cron.schedule('violation-inbox-processor', '*/15 * * * *', $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/violation-inbox-processor',
    headers := jsonb_build_object('Content-Type','application/json','x-agent-id','violation-inbox-processor','x-agent-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='agent_secret_violation_inbox' LIMIT 1)),
    body := jsonb_build_object('companyId','24bc0b21-4e2d-4413-9842-31719a3669f4','limit',5)
  );
$command$);

SELECT cron.schedule('nightly-ops-auditor', '30 2 * * *', $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/nightly-ops-auditor',
    headers := jsonb_build_object('Content-Type','application/json','x-agent-id','nightly-ops-auditor','x-agent-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='agent_secret_nightly_ops' LIMIT 1)),
    body := jsonb_build_object('companyId','24bc0b21-4e2d-4413-9842-31719a3669f4')
  );
$command$);

SELECT cron.schedule('smart-contract-assigner', '0,30 * * * *', $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/smart-contract-assigner',
    headers := jsonb_build_object('Content-Type','application/json','x-agent-id','smart-contract-assigner','x-agent-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='agent_secret_smart_contract_assigner' LIMIT 1)),
    body := jsonb_build_object('companyId','24bc0b21-4e2d-4413-9842-31719a3669f4','mode',CASE WHEN EXTRACT(HOUR FROM now())=3 THEN 'rebalance' ELSE 'assign_new' END)
  );
$command$);

SELECT cron.schedule('customer-duplicate-detector', '0 4 * * *', $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/customer-duplicate-detector',
    headers := jsonb_build_object('Content-Type','application/json','x-agent-id','customer-duplicate-detector','x-agent-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='agent_secret_customer_duplicate_detector' LIMIT 1)),
    body := jsonb_build_object('companyId','24bc0b21-4e2d-4413-9842-31719a3669f4')
  );
$command$);

SELECT cron.schedule('contract-id-scanner', '*/15 * * * *', $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/contract-id-scanner',
    headers := jsonb_build_object('Content-Type','application/json','x-agent-id','contract-id-scanner','x-agent-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='agent_secret_contract_id_scanner' LIMIT 1)),
    body := jsonb_build_object('mode','batch','companyId','24bc0b21-4e2d-4413-9842-31719a3669f4','limit',10)
  );
$command$);

SELECT cron.schedule('customer-proposal-ai-reviewer', '*/15 * * * *', $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/customer-proposal-ai-reviewer',
    headers := jsonb_build_object('Content-Type','application/json','x-agent-id','customer-proposal-ai-reviewer','x-agent-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='agent_secret_customer_proposal_reviewer' LIMIT 1)),
    body := jsonb_build_object('mode','batch','companyId','24bc0b21-4e2d-4413-9842-31719a3669f4','limit',25)
  );
$command$);

SELECT cron.schedule('nightly-contract-terms-scan', '10 3 * * *', $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/contract-terms-scanner',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='supabase_anon_key' LIMIT 1),'x-agent-id','contract-terms-scanner','x-agent-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='agent_secret_contract_terms_scanner' LIMIT 1)),
    body := jsonb_build_object('mode','batch','companyId','24bc0b21-4e2d-4413-9842-31719a3669f4','maxDocuments',10,'autoApply',false),
    timeout_milliseconds := 120000
  );
$command$);

-- Recreate the two legacy rows in their pre-migration inactive state. They are
-- intentionally not reactivated because the preceding retirement migration
-- had already paused them in favour of the central audit control plane.
WITH scheduled AS (
  SELECT cron.schedule('daily-audit-agent', '0 4 * * *', $command$
    SELECT net.http_post(
      url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/daily-audit-agent',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-agent-secret',COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='audit_agent_secret' LIMIT 1),'')
      ),
      body := jsonb_build_object(
        'dryRun',false,
        'maxCompanies',20,
        'maxContractsPerCompany',120,
        'maxInvoicesPerCompany',1000,
        'maxJournalRepairBatch',250,
        'includeAiSummary',true
      )
    );
  $command$) AS job_id
)
SELECT cron.alter_job(job_id := scheduled.job_id, active := false)
FROM scheduled;

WITH scheduled AS (
  SELECT cron.schedule('safe-auto-repair', '30 3 * * *', $command$
    SELECT net.http_post(
      url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/safe-auto-repair',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-agent-secret',COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='contract_scanner_secret' LIMIT 1),'')
      ),
      body := jsonb_build_object('companyId','24bc0b21-4e2d-4413-9842-31719a3669f4')
    );
  $command$) AS job_id
)
SELECT cron.alter_job(job_id := scheduled.job_id, active := false)
FROM scheduled;

COMMIT;
