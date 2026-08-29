-- First-run activation: currently expected to create 15 review tasks.

BEGIN;

UPDATE public.taqadi_filing_jobs
SET status = status
WHERE status = 'needs_human';

COMMIT;
