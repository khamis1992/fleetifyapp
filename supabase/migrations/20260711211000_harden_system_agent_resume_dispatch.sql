-- Resume the daily run frequently without creating it before its scheduled start.

CREATE OR REPLACE FUNCTION public.invoke_system_audit_orchestrator_v3()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/system-audit-orchestrator-v9',
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
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'idempotencyKey', 'system-audit:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD') ||
        ':24bc0b21-4e2d-4413-9842-31719a3669f4:apply:contracts,accounting,fleet,customers,inventory,legal,employees',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'batchSize', 100,
      'maxCompanies', 1,
      'includeAiTriage', true,
      'resumeStale', true,
      'waitForDispatch', false
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.invoke_system_audit_orchestrator_resume_v1()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/system-audit-orchestrator-v9',
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
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'idempotencyKey', 'system-audit:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD') ||
        ':24bc0b21-4e2d-4413-9842-31719a3669f4:apply:contracts,accounting,fleet,customers,inventory,legal,employees',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'resumeOnly', true,
      'resumeStale', true,
      'waitForDispatch', false
    )
  );
$$;

REVOKE ALL ON FUNCTION public.invoke_system_audit_orchestrator_resume_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_system_audit_orchestrator_resume_v1() TO service_role;

SELECT cron.unschedule(job.jobname)
FROM cron.job AS job
WHERE job.jobname IN (
  'system-audit-orchestrator-v3-resume',
  'system-audit-orchestrator-v9-resume-fast',
  'system-audit-orchestrator-v9-resume-hourly'
);

SELECT cron.schedule(
  'system-audit-orchestrator-v9-resume-fast',
  '*/5 0-5 * * *',
  $$SELECT public.invoke_system_audit_orchestrator_resume_v1();$$
);

SELECT cron.schedule(
  'system-audit-orchestrator-v9-resume-hourly',
  '45 6-23 * * *',
  $$SELECT public.invoke_system_audit_orchestrator_resume_v1();$$
);
