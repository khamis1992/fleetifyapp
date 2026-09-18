-- Activate only after Microsoft Graph Edge secrets and the matching Vault
-- secret `moi_mail_secret` are configured and the Edge Function is deployed.

BEGIN;

CREATE OR REPLACE FUNCTION public.invoke_traffic_mail_ingest_v1()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_url text;
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT secret.decrypted_secret
  INTO v_url
  FROM vault.decrypted_secrets secret
  WHERE secret.name = 'supabase_project_url'
  LIMIT 1;

  SELECT secret.decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets secret
  WHERE secret.name = 'moi_mail_secret'
  LIMIT 1;

  IF NULLIF(v_url, '') IS NULL OR NULLIF(v_secret, '') IS NULL THEN
    RAISE EXCEPTION 'Traffic mail scheduler secrets are not configured';
  END IF;

  SELECT net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/ingest-traffic-mail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', v_secret
    ),
    body := jsonb_build_object(
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'action', 'sync'
    )
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.invoke_traffic_mail_ingest_v1()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_traffic_mail_ingest_v1()
TO service_role;

SELECT cron.unschedule(job.jobname)
FROM cron.job job
WHERE job.jobname = 'traffic-mail-ingest-v1';

SELECT cron.schedule(
  'traffic-mail-ingest-v1',
  '*/15 * * * *',
  $$SELECT public.invoke_traffic_mail_ingest_v1();$$
);

COMMIT;
