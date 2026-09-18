BEGIN;

DROP TRIGGER IF EXISTS trg_hydrate_and_guard_taqadi_filing_links
ON public.taqadi_filing_jobs;
DROP FUNCTION IF EXISTS public.hydrate_and_guard_taqadi_filing_links_v1();

ALTER TABLE public.taqadi_filing_jobs
  DROP CONSTRAINT IF EXISTS taqadi_filing_jobs_source_document_scope_fkey,
  DROP CONSTRAINT IF EXISTS taqadi_filing_jobs_lawsuit_preparation_scope_fkey,
  DROP COLUMN IF EXISTS source_document_id,
  DROP COLUMN IF EXISTS lawsuit_preparation_id;

DROP INDEX IF EXISTS public.lawsuit_preparations_company_contract_id_key;

-- Intentionally retain quarantined evidence and missing-PDF requests. A
-- rollback must never reactivate ambiguous legal evidence automatically.

COMMIT;
