BEGIN;

DROP FUNCTION IF EXISTS public.sync_agent_operational_alerts_v1(uuid);
DROP FUNCTION IF EXISTS public.upsert_agent_operational_alert_task_v1(uuid,text,text,text,text,boolean);
DROP TABLE IF EXISTS public.agent_operational_alert_task_links;

COMMIT;
