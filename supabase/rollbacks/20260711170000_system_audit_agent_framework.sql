-- Rollback plan for 20260711170000 and 20260711173000.
-- Export system_agent_* tables before running if their audit history must be retained.

SELECT cron.unschedule('system-audit-orchestrator')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'system-audit-orchestrator');

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid, text);
DROP FUNCTION IF EXISTS public.system_agent_apply_vehicle_status_repair(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.system_agent_apply_repair(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.system_agent_finish_job(uuid, uuid, boolean, boolean, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS public.system_agent_refresh_run(uuid);
DROP FUNCTION IF EXISTS public.system_agent_claim_job(uuid, integer);
DROP FUNCTION IF EXISTS public.system_agent_create_run(text, text[], uuid, integer, integer, text, text, jsonb);
DROP FUNCTION IF EXISTS public.system_agent_date_in_closed_period(uuid, date);
DROP FUNCTION IF EXISTS public.system_agent_pick_fields(jsonb, text[]);

DROP TABLE IF EXISTS public.system_agent_repairs;
DROP TABLE IF EXISTS public.system_agent_findings;
DROP TABLE IF EXISTS public.system_agent_jobs;
DROP TABLE IF EXISTS public.system_agent_runs;
DROP TABLE IF EXISTS public.system_agent_command_registry;
