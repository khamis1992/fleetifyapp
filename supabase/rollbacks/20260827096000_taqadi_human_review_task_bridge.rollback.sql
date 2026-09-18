-- Stop future task synchronization. Existing tasks remain as audit history.

BEGIN;

DROP TRIGGER IF EXISTS trg_enrich_taqadi_human_review_task_from_event_v1
ON public.taqadi_filing_job_events;
DROP FUNCTION IF EXISTS public.enrich_taqadi_human_review_task_from_event_v1();
DROP TRIGGER IF EXISTS trg_sync_taqadi_human_review_task_v1
ON public.taqadi_filing_jobs;
DROP FUNCTION IF EXISTS public.sync_taqadi_human_review_task_v1();
DROP TABLE IF EXISTS public.taqadi_human_review_task_links;

COMMIT;
