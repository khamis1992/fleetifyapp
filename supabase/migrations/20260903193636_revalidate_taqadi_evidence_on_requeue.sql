-- Legacy retry/resume commands update status, not payload/source columns, and
-- therefore used to bypass the deployed evidence-link trigger. Reuse that
-- exact validation when entering the queue, without preventing cancellation,
-- failure recording or heartbeat updates to incomplete historical jobs.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TRIGGER trg_revalidate_taqadi_filing_links_on_requeue
BEFORE UPDATE OF status ON public.taqadi_filing_jobs
FOR EACH ROW
WHEN (NEW.status = 'queued')
EXECUTE FUNCTION public.hydrate_and_guard_taqadi_filing_links_v1();

-- Keep refreshed evidence and the resume transition in the same transaction.
-- Both existing commands retain their authentication, stopped-state, external
-- reference and uncertain-submission checks. No additional privilege is needed.
CREATE OR REPLACE FUNCTION public.resume_taqadi_filing_job_v2(
  p_company_id uuid, p_job_id uuid, p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'TAQADI_FRESH_PACKAGE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  PERFORM public.refresh_taqadi_filing_job_payload_v1(p_company_id, p_job_id, p_payload);
  RETURN public.resume_taqadi_filing_job_v1(p_company_id, p_job_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.resume_taqadi_filing_job_v2(uuid, uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resume_taqadi_filing_job_v2(uuid, uuid, jsonb)
  TO authenticated, service_role;

COMMIT;
