-- Migration: Add WhatsApp Automation
-- =====================================
-- Purpose: Enable automatic processing of queued WhatsApp reminders
-- Date: 2025-11-03
-- =====================================

-- Step 1: Create function to invoke Edge Function
CREATE OR REPLACE FUNCTION invoke_whatsapp_edge_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called by cron or trigger
  -- It invokes the Edge Function via pg_net extension
  
  -- Check if there are any queued reminders
  IF EXISTS (
    SELECT 1 FROM reminder_schedules 
    WHERE status = 'queued' 
    LIMIT 1
  ) THEN
    -- Log that we're about to invoke the function
    RAISE NOTICE 'Invoking WhatsApp Edge Function for queued reminders';
    
    -- Note: Actual invocation would be done via pg_net extension
    -- For now, we'll just log. The actual invocation will be set up via Cron.
    -- Example:
    -- PERFORM net.http_post(
    --   url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-whatsapp-reminders',
    --   headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    -- );
  END IF;
END;
$$;

-- Step 2: Create statistics function
CREATE OR REPLACE FUNCTION get_whatsapp_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_total_queued INTEGER;
  v_total_sent INTEGER;
  v_total_failed INTEGER;
  v_success_rate NUMERIC;
  v_avg_send_time NUMERIC;
BEGIN
  -- Count queued reminders
  SELECT COUNT(*) INTO v_total_queued
  FROM reminder_schedules
  WHERE status = 'queued';

  -- Count sent reminders (last 24 hours)
  SELECT COUNT(*) INTO v_total_sent
  FROM reminder_schedules
  WHERE status = 'sent'
    AND sent_at >= NOW() - INTERVAL '24 hours';

  -- Count failed reminders (last 24 hours)
  SELECT COUNT(*) INTO v_total_failed
  FROM reminder_schedules
  WHERE status = 'failed'
    AND updated_at >= NOW() - INTERVAL '24 hours';

  -- Calculate success rate
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'failed')) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'sent')::DECIMAL / 
           COUNT(*) FILTER (WHERE status IN ('sent', 'failed'))) * 100, 
          2
        )
      ELSE 0
    END INTO v_success_rate
  FROM reminder_schedules
  WHERE updated_at >= NOW() - INTERVAL '24 hours';

  -- Calculate average send time (in seconds)
  SELECT 
    ROUND(AVG(EXTRACT(EPOCH FROM (sent_at - created_at)))::NUMERIC, 2)
    INTO v_avg_send_time
  FROM reminder_schedules
  WHERE status = 'sent' 
    AND sent_at >= NOW() - INTERVAL '24 hours'
    AND sent_at IS NOT NULL;

  -- Build JSON result
  result := json_build_object(
    'total_queued', COALESCE(v_total_queued, 0),
    'total_sent', COALESCE(v_total_sent, 0),
    'total_failed', COALESCE(v_total_failed, 0),
    'success_rate', COALESCE(v_success_rate, 0),
    'avg_send_time', COALESCE(v_avg_send_time, 0),
    'last_updated', NOW()
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_whatsapp_stats() IS 
'Returns WhatsApp reminders statistics for the last 24 hours including queue size, success rate, and average send time';

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION invoke_whatsapp_edge_function TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_stats TO authenticated;

-- Step 4: Create view for monitoring
CREATE OR REPLACE VIEW whatsapp_reminders_status AS
SELECT 
  rs.id,
  rs.customer_name,
  rs.phone_number,
  rs.reminder_type,
  rs.status,
  rs.created_at,
  rs.sent_at,
  rs.last_error,
  rs.retry_count,
  CASE 
    WHEN rs.sent_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (rs.sent_at - rs.created_at))
    ELSE NULL
  END as send_duration_seconds,
  i.invoice_number,
  i.total_amount,
  c.first_name_ar || ' ' || c.last_name_ar as customer_full_name
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
LEFT JOIN customers c ON rs.customer_id = c.id
WHERE rs.created_at >= NOW() - INTERVAL '7 days'
ORDER BY rs.created_at DESC;

COMMENT ON VIEW whatsapp_reminders_status IS 
'View for monitoring WhatsApp reminders status with invoice and customer details';

-- Step 5: Grant view access
GRANT SELECT ON whatsapp_reminders_status TO authenticated;

-- Step 6: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_queued_created 
ON reminder_schedules(status, created_at) 
WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_sent_at 
ON reminder_schedules(sent_at DESC) 
WHERE status = 'sent';

-- Step 7: Create cleanup function (remove old reminders)
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Delete sent/failed reminders older than 90 days
  DELETE FROM reminder_schedules
  WHERE status IN ('sent', 'failed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old reminder records', v_deleted;
  
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_reminders() IS 
'Deletes sent/failed/cancelled reminders older than 90 days to keep the table clean';

GRANT EXECUTE ON FUNCTION cleanup_old_reminders TO authenticated;

-- =====================================
-- Setup Instructions (Run manually after deployment)
-- =====================================

-- 1. Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Enable pg_net extension (if not already enabled)  
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Schedule the Edge Function to run every 5 minutes
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with actual values
/*
SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
*/

-- 4. Schedule cleanup to run daily at 2 AM
/*
SELECT cron.schedule(
  'cleanup-old-reminders',
  '0 2 * * *', -- Daily at 2 AM
  $$SELECT cleanup_old_reminders();$$
);
*/

-- =====================================
-- Verification Queries
-- =====================================

-- Check queued reminders
-- SELECT * FROM reminder_schedules WHERE status = 'queued' ORDER BY created_at;

-- Check recent activity
-- SELECT * FROM whatsapp_reminders_status LIMIT 20;

-- Check stats
-- SELECT get_whatsapp_stats();

-- Check cron jobs
-- SELECT * FROM cron.job WHERE jobname LIKE '%whatsapp%';

