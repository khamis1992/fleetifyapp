-- ============================================
-- Setup Automatic Report Scheduling with pg_cron
-- ============================================
-- This migration sets up automatic daily and weekly reports
-- via Supabase Edge Functions using pg_cron extension

-- Note: pg_cron and pg_net need to be enabled in Supabase Dashboard
-- Go to: Database > Extensions > Enable pg_cron and pg_net

-- ============================================
-- 1. Create table to track scheduled report runs
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_report_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  scheduled_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent logs
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_created 
  ON scheduled_report_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_type_status 
  ON scheduled_report_logs(report_type, status);

-- ============================================
-- 2. Create function to trigger daily report
-- ============================================
CREATE OR REPLACE FUNCTION trigger_daily_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_response JSONB;
  v_project_ref TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get project reference from settings or environment
  -- Note: Update these values or use vault secrets
  v_project_ref := current_setting('app.settings.supabase_project_ref', true);
  v_service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  -- If settings not available, try to get from environment
  IF v_project_ref IS NULL THEN
    v_project_ref := 'qwhunliohlkkahbspfiu'; -- Fleetify project ref
  END IF;

  -- Create log entry
  INSERT INTO scheduled_report_logs (report_type, status, started_at)
  VALUES ('daily', 'running', NOW())
  RETURNING id INTO v_log_id;

  -- Call the Edge Function using pg_net
  BEGIN
    SELECT net.http_post(
      url := format('https://%s.supabase.co/functions/v1/send-daily-report', v_project_ref),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', format('Bearer %s', v_service_role_key)
      ),
      body := '{}'::jsonb
    ) INTO v_response;

    -- Update log with success
    UPDATE scheduled_report_logs
    SET 
      status = 'completed',
      completed_at = NOW(),
      response_data = v_response
    WHERE id = v_log_id;

  EXCEPTION WHEN OTHERS THEN
    -- Update log with error
    UPDATE scheduled_report_logs
    SET 
      status = 'failed',
      completed_at = NOW(),
      error_message = SQLERRM
    WHERE id = v_log_id;
  END;
END;
$$;

-- ============================================
-- 3. Create function to trigger weekly report
-- ============================================
CREATE OR REPLACE FUNCTION trigger_weekly_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_response JSONB;
  v_project_ref TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get project reference
  v_project_ref := current_setting('app.settings.supabase_project_ref', true);
  v_service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  IF v_project_ref IS NULL THEN
    v_project_ref := 'qwhunliohlkkahbspfiu'; -- Fleetify project ref
  END IF;

  -- Create log entry
  INSERT INTO scheduled_report_logs (report_type, status, started_at)
  VALUES ('weekly', 'running', NOW())
  RETURNING id INTO v_log_id;

  -- Call the Edge Function using pg_net
  BEGIN
    SELECT net.http_post(
      url := format('https://%s.supabase.co/functions/v1/send-weekly-report', v_project_ref),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', format('Bearer %s', v_service_role_key)
      ),
      body := '{}'::jsonb
    ) INTO v_response;

    -- Update log with success
    UPDATE scheduled_report_logs
    SET 
      status = 'completed',
      completed_at = NOW(),
      response_data = v_response
    WHERE id = v_log_id;

  EXCEPTION WHEN OTHERS THEN
    -- Update log with error
    UPDATE scheduled_report_logs
    SET 
      status = 'failed',
      completed_at = NOW(),
      error_message = SQLERRM
    WHERE id = v_log_id;
  END;
END;
$$;

-- ============================================
-- 4. Setup pg_cron schedules
-- ============================================
-- Note: These commands need to be run manually in Supabase SQL Editor
-- because pg_cron.schedule requires the extension to be enabled first

-- Run this AFTER enabling pg_cron extension in Supabase Dashboard:

/*
-- Daily Report: Every day at 8:00 AM Qatar time (UTC+3, so 5:00 AM UTC)
SELECT cron.schedule(
  'daily-fleet-report',
  '0 5 * * *',  -- 5:00 AM UTC = 8:00 AM Qatar
  'SELECT trigger_daily_report()'
);

-- Weekly Report: Every Sunday at 9:00 AM Qatar time (6:00 AM UTC)
SELECT cron.schedule(
  'weekly-fleet-report',
  '0 6 * * 0',  -- 6:00 AM UTC on Sunday = 9:00 AM Qatar
  'SELECT trigger_weekly_report()'
);

-- To view scheduled jobs:
SELECT * FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('daily-fleet-report');
-- SELECT cron.unschedule('weekly-fleet-report');

-- To run immediately (for testing):
-- SELECT trigger_daily_report();
-- SELECT trigger_weekly_report();
*/

-- ============================================
-- 5. Create view for monitoring
-- ============================================
CREATE OR REPLACE VIEW v_report_schedule_status AS
SELECT 
  report_type,
  COUNT(*) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '7 days') as successful_last_7_days,
  COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') as failed_last_7_days,
  MAX(completed_at) FILTER (WHERE status = 'completed') as last_successful_run,
  MAX(created_at) FILTER (WHERE status = 'failed') as last_failed_run
FROM scheduled_report_logs
GROUP BY report_type;

-- ============================================
-- 6. Grant permissions
-- ============================================
GRANT SELECT ON scheduled_report_logs TO authenticated;
GRANT SELECT ON v_report_schedule_status TO authenticated;

-- ============================================
-- 7. Add RLS policies
-- ============================================
ALTER TABLE scheduled_report_logs ENABLE ROW LEVEL SECURITY;

-- Allow viewing logs (no company restriction for admin purposes)
CREATE POLICY "Allow viewing scheduled report logs"
  ON scheduled_report_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- IMPORTANT: Manual Steps Required
-- ============================================
-- 1. Go to Supabase Dashboard > Database > Extensions
-- 2. Enable 'pg_cron' extension
-- 3. Enable 'pg_net' extension (for HTTP calls)
-- 4. Run the commented cron.schedule commands above in SQL Editor
-- 5. Deploy the Edge Functions:
--    supabase functions deploy send-daily-report
--    supabase functions deploy send-weekly-report

COMMENT ON TABLE scheduled_report_logs IS 
  'Tracks all scheduled report executions for monitoring and debugging';
