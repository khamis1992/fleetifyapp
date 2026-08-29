BEGIN;

SELECT cron.unschedule(job.jobname)
FROM cron.job job
WHERE job.jobname = 'traffic-mail-ingest-v1';
DROP FUNCTION IF EXISTS public.invoke_traffic_mail_ingest_v1();

COMMIT;
