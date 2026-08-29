-- Safe rollback for 20260827091000_move_legacy_cron_jwts_to_vault.sql.
-- Literal JWTs are intentionally never restored. A rollback pauses the affected
-- jobs so an operator can correct Vault/configuration without exposing a token.

DO $rollback$
DECLARE
  v_job record;
BEGIN
  FOR v_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'monthly-vehicle-depreciation',
      'generate-monthly-invoices',
      'whatsapp-reminder-day28-pre-due',
      'whatsapp-reminder-day2-overdue',
      'whatsapp-reminder-day5-final-warning',
      'whatsapp-reminder-day10-legal-action'
    )
  LOOP
    PERFORM cron.alter_job(job_id := v_job.jobid, active := false);
  END LOOP;
END;
$rollback$;

