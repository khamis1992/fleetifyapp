BEGIN;

DROP INDEX IF EXISTS public.uq_tasks_open_system_audit_key;

UPDATE public.tasks task
SET status = task.metadata #>> '{openSystemAuditTaskUniqueMigration,previousStatus}',
    metadata = task.metadata - 'openSystemAuditTaskUniqueMigration',
    updated_at = now()
WHERE task.metadata ? 'openSystemAuditTaskUniqueMigration'
  AND task.metadata #>> '{openSystemAuditTaskUniqueMigration,previousStatus}'
    IN ('pending', 'in_progress', 'on_hold');

COMMIT;
