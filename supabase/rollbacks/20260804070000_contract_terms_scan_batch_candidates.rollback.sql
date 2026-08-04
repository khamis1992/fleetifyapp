-- Rollback: remove the nightly scan cron and the candidate picker.

BEGIN;

SELECT cron.unschedule('nightly-contract-terms-scan')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-contract-terms-scan');

DROP FUNCTION IF EXISTS public.contract_terms_scan_batch_candidates(integer);

COMMIT;
