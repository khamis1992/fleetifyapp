-- Restore only the prior trigger coverage; preserve the original link guard.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS trg_revalidate_taqadi_filing_links_on_requeue
  ON public.taqadi_filing_jobs;
DROP FUNCTION IF EXISTS public.resume_taqadi_filing_job_v2(uuid, uuid, jsonb);
COMMIT;
