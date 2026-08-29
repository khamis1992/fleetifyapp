-- Safe rollback: stop the seven schedules and disable their machine
-- identities. Registry rows, Vault secrets, and invocation history are kept
-- so no audit evidence is destroyed and deployed Edge Functions remain safe.

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

UPDATE public.agent_invocation_registry
SET enabled = false,
    updated_at = now()
WHERE agent_id IN (
  'violation-inbox-processor',
  'nightly-ops-auditor',
  'smart-contract-assigner',
  'customer-duplicate-detector',
  'contract-id-scanner',
  'customer-proposal-ai-reviewer',
  'contract-terms-scanner'
);

COMMIT;
