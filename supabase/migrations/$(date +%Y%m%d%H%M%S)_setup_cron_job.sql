-- Setup Cron Job for Legal Case Auto-Create Triggers
-- This will run the Edge Function every 6 hours to check triggers

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cron job to run every 6 hours
-- Note: Replace [YOUR_PROJECT_REF] and [YOUR_SERVICE_ROLE_KEY] with actual values
SELECT cron.schedule(
  'check-legal-case-triggers',
  '0 */6 * * *',  -- Every 6 hours at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/check-legal-case-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [YOUR_SERVICE_ROLE_KEY]'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- Unschedule if needed (run this manually if you want to remove the job)
-- SELECT cron.unschedule('check-legal-case-triggers');

-- Create a table to log cron job executions
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(100) NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'success',
  cases_created INTEGER DEFAULT 0,
  configs_processed INTEGER DEFAULT 0,
  error_message TEXT,
  response_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON cron_job_logs(executed_at DESC);

-- Enable RLS
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for cron_job_logs (admin only)
CREATE POLICY "Only admins can view cron logs"
  ON cron_job_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to log cron job execution
CREATE OR REPLACE FUNCTION log_cron_execution(
  p_job_name VARCHAR,
  p_status VARCHAR,
  p_cases_created INTEGER DEFAULT 0,
  p_configs_processed INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_response_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO cron_job_logs (
    job_name,
    status,
    cases_created,
    configs_processed,
    error_message,
    response_data
  ) VALUES (
    p_job_name,
    p_status,
    p_cases_created,
    p_configs_processed,
    p_error_message,
    p_response_data
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Manual trigger function (can be called from client)
CREATE OR REPLACE FUNCTION trigger_legal_case_check()
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  request_id BIGINT
) AS $$
DECLARE
  v_request_id BIGINT;
BEGIN
  -- Call the Edge Function via HTTP
  SELECT
    net.http_post(
      url := 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/check-legal-case-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [YOUR_SERVICE_ROLE_KEY]'
      ),
      body := '{}'::jsonb
    ) INTO v_request_id;
  
  RETURN QUERY SELECT 
    true as success,
    'تم تشغيل الفحص بنجاح' as message,
    v_request_id as request_id;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    false as success,
    SQLERRM as message,
    NULL::BIGINT as request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_legal_case_check() TO authenticated;

/*
MANUAL SETUP INSTRUCTIONS:
==========================

1. Get your Supabase project reference:
   - Go to Project Settings > API
   - Copy the "Project URL" (e.g., https://abcdefgh.supabase.co)
   - Extract the project ref (abcdefgh)

2. Get your Service Role Key:
   - Go to Project Settings > API
   - Copy the "service_role" key (keep it secret!)

3. Replace placeholders in this file:
   - Replace [YOUR_PROJECT_REF] with your project reference
   - Replace [YOUR_SERVICE_ROLE_KEY] with your service role key

4. Run this migration:
   supabase db push

5. Verify the cron job:
   SELECT * FROM cron.job WHERE jobname = 'check-legal-case-triggers';

6. View logs:
   SELECT * FROM cron_job_logs ORDER BY executed_at DESC LIMIT 10;

7. Manual trigger (for testing):
   SELECT * FROM trigger_legal_case_check();

SCHEDULE EXPLANATION:
====================
'0 */6 * * *' means:
- 0: At minute 0
- */6: Every 6 hours
- *: Every day of month
- *: Every month
- *: Every day of week

So it runs at: 00:00, 06:00, 12:00, 18:00 daily

To change schedule:
- Every hour: '0 * * * *'
- Every 12 hours: '0 */12 * * *'
- Daily at 2 AM: '0 2 * * *'
- Every Monday at 9 AM: '0 9 * * 1'
*/
