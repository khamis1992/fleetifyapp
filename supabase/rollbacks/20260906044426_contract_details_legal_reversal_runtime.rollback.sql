BEGIN;
-- Disable the new API while retaining audit evidence and request identifiers.
DROP TRIGGER IF EXISTS trg_guard_taqadi_queue_open_case ON public.taqadi_filing_jobs;
DROP FUNCTION IF EXISTS public.guard_taqadi_queue_open_case_v1();
DROP FUNCTION IF EXISTS public.revert_contract_from_legal_v2(uuid,uuid,text,uuid,uuid);
COMMIT;
