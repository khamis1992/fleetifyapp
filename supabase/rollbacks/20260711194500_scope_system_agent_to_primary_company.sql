CREATE OR REPLACE FUNCTION public.invoke_system_audit_orchestrator_v3()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/system-audit-orchestrator-v3',
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
      'idempotencyKey', 'system-audit:' || to_char(timezone('UTC', now()), 'YYYY-MM-DD') ||
        ':all:apply:contracts,accounting,fleet,customers,inventory,legal,employees',
      'domains', jsonb_build_array('contracts','accounting','fleet','customers','inventory','legal','employees'),
      'batchSize', 100,
      'maxCompanies', 20,
      'includeAiTriage', true,
      'resumeStale', true,
      'waitForDispatch', false
    )
  );
$$;
