-- Remove literal JWTs from active pg_cron commands without exposing them in Git.
-- The existing service-role token is copied directly from cron.job into Vault
-- inside the database, then every affected command reads it from Vault at run time.

DO $migration$
DECLARE
  v_service_token text;
  v_project_url text;
  v_job_id bigint;
BEGIN
  SELECT (regexp_match(command,
    'Bearer[[:space:]]+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)', 'i'))[1]
  INTO v_service_token
  FROM cron.job
  WHERE jobname = 'generate-monthly-invoices'
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'legacy_cron_service_role_key'
  ) THEN
    IF v_service_token IS NULL THEN
      RAISE EXCEPTION 'Cannot migrate cron authentication: service token source is missing';
    END IF;

    PERFORM vault.create_secret(
      v_service_token,
      'legacy_cron_service_role_key',
      'Service-role JWT migrated from legacy pg_cron commands; rotate after migration',
      NULL
    );
  END IF;

  SELECT (regexp_match(command, '(https://[A-Za-z0-9-]+\.supabase\.co)', 'i'))[1]
  INTO v_project_url
  FROM cron.job
  WHERE jobname = 'generate-monthly-invoices'
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'supabase_project_url'
  ) THEN
    IF v_project_url IS NULL THEN
      RAISE EXCEPTION 'Cannot migrate cron authentication: project URL source is missing';
    END IF;

    PERFORM vault.create_secret(
      v_project_url,
      'supabase_project_url',
      'Base URL used by Vault-backed pg_cron Edge Function calls',
      NULL
    );
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'monthly-vehicle-depreciation';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(
      job_id := v_job_id,
      command := $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/process-monthly-depreciation',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'legacy_cron_service_role_key')
          ),
          body := jsonb_build_object('depreciation_date', date_trunc('month', CURRENT_DATE)::date)
        );
      $job$
    );
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'generate-monthly-invoices';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(
      job_id := v_job_id,
      command := $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/generate-monthly-invoices',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'legacy_cron_service_role_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'whatsapp-reminder-day28-pre-due';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(
      job_id := v_job_id,
      command := $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/send-whatsapp-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'legacy_cron_service_role_key')
          ),
          body := '{"reminderType":"pre_due"}'::jsonb
        );
      $job$
    );
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'whatsapp-reminder-day2-overdue';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(
      job_id := v_job_id,
      command := $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/send-whatsapp-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'legacy_cron_service_role_key')
          ),
          body := '{"reminderType":"overdue_day2","daysLate":2}'::jsonb
        );
      $job$
    );
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'whatsapp-reminder-day5-final-warning';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(
      job_id := v_job_id,
      command := $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/send-whatsapp-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'legacy_cron_service_role_key')
          ),
          body := '{"reminderType":"final_warning","daysLate":5}'::jsonb
        );
      $job$
    );
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'whatsapp-reminder-day10-legal-action';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(
      job_id := v_job_id,
      command := $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') || '/functions/v1/send-whatsapp-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'legacy_cron_service_role_key')
          ),
          body := '{"reminderType":"legal_action","daysLate":10}'::jsonb
        );
      $job$
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE active
      AND command ~ 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
  ) THEN
    RAISE EXCEPTION 'One or more active cron commands still contain a literal JWT';
  END IF;
END;
$migration$;


;
