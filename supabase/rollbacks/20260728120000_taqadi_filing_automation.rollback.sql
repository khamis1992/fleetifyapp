DROP FUNCTION IF EXISTS public.heartbeat_taqadi_worker_v1(text, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.complete_taqadi_filing_job_v1(uuid, text, text, text, numeric, jsonb);
DROP FUNCTION IF EXISTS public.update_taqadi_filing_job_v1(uuid, text, text, text, integer, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.claim_next_taqadi_filing_job_v1(text, text);
DROP FUNCTION IF EXISTS public.cancel_taqadi_filing_job_v1(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.retry_taqadi_filing_job_v1(uuid, uuid);
DROP FUNCTION IF EXISTS public.enqueue_taqadi_filing_job_v1(uuid, uuid, jsonb, text, boolean);
DROP FUNCTION IF EXISTS public.validate_taqadi_filing_payload_v1(uuid, uuid, jsonb);

DROP TABLE IF EXISTS public.taqadi_filing_artifacts;
DROP TABLE IF EXISTS public.taqadi_filing_job_events;
DROP TABLE IF EXISTS public.taqadi_automation_workers;
DROP TABLE IF EXISTS public.taqadi_filing_jobs;

DELETE FROM storage.buckets WHERE id = 'taqadi-automation-artifacts';
