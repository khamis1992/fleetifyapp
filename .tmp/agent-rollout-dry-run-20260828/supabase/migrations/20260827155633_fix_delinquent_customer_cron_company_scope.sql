-- Keep the delinquent-customer cache refresh company-scoped when pg_cron runs
-- without an authenticated JWT. The RPC deliberately rejects a NULL company
-- outside service-role API calls, so the scheduled database session must pass
-- the canonical company explicitly.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.update_delinquent_customers(uuid)') IS NULL THEN
    RAISE EXCEPTION 'public.update_delinquent_customers(uuid) is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.companies company
    WHERE company.id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
  ) THEN
    RAISE EXCEPTION 'Fleetify company is missing';
  END IF;
END;
$preflight$;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'update-delinquent-customers';

SELECT cron.schedule(
  'update-delinquent-customers',
  '0 9 * * *',
  $$SELECT * FROM public.update_delinquent_customers(
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
  );$$
);

COMMIT;;
