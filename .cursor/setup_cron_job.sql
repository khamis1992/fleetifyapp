-- =====================================
-- Setup WhatsApp Cron Job
-- =====================================
-- Purpose: Schedule automatic processing of WhatsApp reminders
-- Frequency: Every 5 minutes
-- =====================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Remove old job if exists (in case of re-setup)
SELECT cron.unschedule('process-whatsapp-reminders') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-whatsapp-reminders'
);

-- Step 3: Schedule the Edge Function to run every 5 minutes
-- ⚠️ IMPORTANT: Replace YOUR_ANON_KEY with your actual anon/public key
-- Get it from: Supabase Dashboard → Project Settings → API → anon public

SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NDg2MzQsImV4cCI6MjA0NjEyNDYzNH0.YOUR_ACTUAL_ANON_KEY_HERE'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Step 4: Verify the cron job was created
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'process-whatsapp-reminders';

-- Expected output:
-- jobname: process-whatsapp-reminders
-- schedule: */5 * * * *
-- active: true

-- =====================================
-- Optional: Schedule cleanup job
-- =====================================

-- Remove old cleanup job if exists
SELECT cron.unschedule('cleanup-old-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-reminders'
);

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'cleanup-old-reminders',
  '0 2 * * *',
  $$SELECT cleanup_old_reminders();$$
);

-- =====================================
-- Verification & Testing
-- =====================================

-- 1. Check if extensions are enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net');

-- 2. List all cron jobs
SELECT * FROM cron.job;

-- 3. Check last run status
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-whatsapp-reminders')
ORDER BY start_time DESC 
LIMIT 5;

-- 4. Manually trigger the Edge Function (for testing)
SELECT
  net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY_HERE'
    ),
    body := '{}'::jsonb
  ) as request_id;

-- =====================================
-- Troubleshooting
-- =====================================

-- If cron job is not working:

-- 1. Check if cron is running
-- SELECT * FROM cron.job WHERE active = true;

-- 2. Check for errors in job runs
-- SELECT * FROM cron.job_run_details WHERE status = 'failed' ORDER BY start_time DESC LIMIT 10;

-- 3. Unschedule and reschedule
-- SELECT cron.unschedule('process-whatsapp-reminders');
-- Then run Step 3 again

-- 4. Test Edge Function directly
-- Use the manual trigger query above (Step 4 in Verification)

-- =====================================
-- Notes
-- =====================================

-- Cron Expression: '*/5 * * * *' means:
--   */5 = Every 5 minutes
--   *   = Every hour
--   *   = Every day
--   *   = Every month
--   *   = Every day of week

-- The Edge Function will:
--   1. Read reminder_schedules WHERE status='queued'
--   2. Send via Ultramsg API
--   3. Update status to 'sent' or 'failed'
--   4. Log to reminder_history

-- Expected performance:
--   - Process up to 50 reminders per run
--   - ~1-2 seconds per message
--   - Max ~600 messages/hour

