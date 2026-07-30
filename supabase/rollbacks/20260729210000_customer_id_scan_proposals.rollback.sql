-- Rollback for 20260729210000_customer_id_scan_proposals.sql

SELECT cron.unschedule('contract-id-scanner')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'contract-id-scanner'
);

DROP TRIGGER IF EXISTS trg_customer_id_scan_proposals_updated_at
  ON public.customer_id_scan_proposals;

DROP FUNCTION IF EXISTS public.customer_id_scan_proposals_set_updated_at();

DROP TABLE IF EXISTS public.customer_id_scan_proposals;
