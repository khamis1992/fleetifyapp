BEGIN;

DROP FUNCTION IF EXISTS public.preview_system_audit_review_task_sync_v1(uuid);
DROP TABLE IF EXISTS public.system_agent_review_task_links;

COMMIT;

