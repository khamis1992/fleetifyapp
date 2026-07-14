-- Restore scheduled dispatch to the preceding isolated release.

create or replace function public.invoke_system_audit_orchestrator_v3()
returns bigint
language sql
security definer
set search_path = public, vault, extensions
as $$
  select net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.functions.supabase.co/system-audit-orchestrator-v13',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', coalesce((
        select decrypted_secret from vault.decrypted_secrets
        where name = 'audit_agent_secret' limit 1
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

create or replace function public.invoke_system_audit_orchestrator_resume_v1()
returns bigint
language sql
security definer
set search_path = public, vault, extensions
as $$
  select net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.functions.supabase.co/system-audit-orchestrator-v13',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', coalesce((
        select decrypted_secret from vault.decrypted_secrets
        where name = 'audit_agent_secret' limit 1
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
