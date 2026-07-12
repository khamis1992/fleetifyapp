-- Restore scheduled execution to the preceding v5 functions.

CREATE OR REPLACE FUNCTION public.invoke_system_audit_orchestrator_v3()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/system-audit-orchestrator-v5',
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
