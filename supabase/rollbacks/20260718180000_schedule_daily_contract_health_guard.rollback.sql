SELECT cron.unschedule(job.jobname)
FROM cron.job AS job
WHERE job.jobname = 'daily-contract-health-guard-v1';

DROP FUNCTION IF EXISTS public.invoke_daily_contract_health_guard_v1();
