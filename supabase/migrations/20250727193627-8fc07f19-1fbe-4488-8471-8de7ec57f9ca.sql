-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule monthly depreciation to run on the 1st of each month at 2 AM
SELECT cron.schedule(
  'monthly-vehicle-depreciation',
  '0 2 1 * *', -- At 2:00 AM on the 1st day of every month
  $$
  SELECT
    net.http_post(
        url:='https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-monthly-depreciation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs"}'::jsonb,
        body:=concat('{"depreciation_date": "', date_trunc(''month'', CURRENT_DATE)::date, '"}')::jsonb
    ) as request_id;
  $$
);

-- Verify cron job was created successfully
SELECT * FROM cron.job WHERE jobname = 'monthly-vehicle-depreciation';