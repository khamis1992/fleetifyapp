-- Prevent concurrent manual/cron traffic-mail runs from racing watermarks.

BEGIN;

ALTER TABLE public.traffic_mail_ingest_state
  ADD COLUMN IF NOT EXISTS sync_lease_token uuid NULL,
  ADD COLUMN IF NOT EXISTS sync_lease_expires_at timestamptz NULL;

CREATE OR REPLACE FUNCTION public.claim_traffic_mail_sync_v1(
  p_company_id uuid,
  p_lease_seconds integer DEFAULT 900
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_token uuid := gen_random_uuid();
  v_claimed uuid;
BEGIN
  IF p_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies WHERE id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Valid company_id is required';
  END IF;

  INSERT INTO public.traffic_mail_ingest_state (company_id)
  VALUES (p_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  UPDATE public.traffic_mail_ingest_state state
  SET sync_lease_token = v_token,
      sync_lease_expires_at = now() + make_interval(
        secs => LEAST(1800, GREATEST(60, COALESCE(p_lease_seconds, 900)))
      ),
      last_sync_started_at = now(),
      last_sync_status = 'running',
      last_error = NULL,
      updated_at = now()
  WHERE state.company_id = p_company_id
    AND (
      state.sync_lease_token IS NULL
      OR state.sync_lease_expires_at IS NULL
      OR state.sync_lease_expires_at <= now()
    )
  RETURNING state.sync_lease_token INTO v_claimed;

  RETURN v_claimed;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_traffic_mail_sync_v1(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_traffic_mail_sync_v1(uuid,integer)
TO service_role;

COMMIT;
