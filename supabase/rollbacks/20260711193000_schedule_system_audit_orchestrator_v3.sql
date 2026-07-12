SELECT cron.unschedule(job.jobname)
FROM cron.job AS job
WHERE job.jobname IN ('system-audit-orchestrator-v3', 'system-audit-orchestrator-v3-resume');

DROP FUNCTION IF EXISTS public.invoke_system_audit_orchestrator_v3();

SELECT cron.schedule(
  'system-audit-orchestrator',
  '30 0 * * *',
  $schedule$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/system-audit-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'audit_agent_secret' LIMIT 1
      ), '')
    ),
    body := jsonb_build_object(
      'mode', 'apply',
      'triggerSource', 'cron',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'batchSize', 100,
      'maxCompanies', 20,
      'includeAiTriage', true,
      'resumeStale', true
    )
  );
  $schedule$
);
