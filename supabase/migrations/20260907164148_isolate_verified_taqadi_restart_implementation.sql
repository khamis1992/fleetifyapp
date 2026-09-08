-- Keep the privileged implementation outside PostgREST's exposed public schema.
-- The public API retains its signature and calls it as the authenticated user.
BEGIN;
CREATE SCHEMA taqadi_private;
REVOKE ALL ON SCHEMA taqadi_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA taqadi_private TO authenticated;
ALTER FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid)
  SET SCHEMA taqadi_private;

CREATE FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(
  p_company_id uuid, p_job_id uuid, p_payload jsonb, p_expected_updated_at timestamptz,
  p_confirmed_not_submitted boolean, p_verification_note text, p_request_id uuid
)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$
  SELECT taqadi_private.restart_verified_unsubmitted_taqadi_job_v1(
    p_company_id, p_job_id, p_payload, p_expected_updated_at,
    p_confirmed_not_submitted, p_verification_note, p_request_id
  );
$function$;
REVOKE ALL ON FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid)
  TO authenticated;
COMMIT;
