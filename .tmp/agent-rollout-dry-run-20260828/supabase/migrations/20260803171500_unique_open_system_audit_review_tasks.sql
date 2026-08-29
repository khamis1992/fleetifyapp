-- Make client-side system-audit task reconciliation concurrency-safe. The
-- partial index covers only tasks owned by this producer; daily-audit tasks
-- have an independent lifecycle and are intentionally excluded.

BEGIN;
WITH ranked AS (
  SELECT
    task.id,
    task.status,
    row_number() OVER (
      PARTITION BY
        task.company_id,
        task.category,
        task.metadata ->> 'systemAuditTaskKey'
      ORDER BY task.updated_at DESC NULLS LAST, task.created_at DESC, task.id DESC
    ) AS position
  FROM public.tasks task
  WHERE task.category = 'system_audit_review'
    AND task.status IN ('pending', 'in_progress', 'on_hold')
    AND task.metadata ->> 'source' = 'system_audit_agent'
    AND NULLIF(task.metadata ->> 'systemAuditTaskKey', '') IS NOT NULL
)
UPDATE public.tasks task
SET status = 'cancelled',
    metadata = COALESCE(task.metadata, '{}'::jsonb) || jsonb_build_object(
      'openSystemAuditTaskUniqueMigration', jsonb_build_object(
        'previousStatus', ranked.status,
        'deduplicatedAt', now()
      )
    ),
    updated_at = now()
FROM ranked
WHERE ranked.id = task.id
  AND ranked.position > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_open_system_audit_key
  ON public.tasks (
    company_id,
    category,
    (metadata ->> 'systemAuditTaskKey')
  )
  WHERE category = 'system_audit_review'
    AND status IN ('pending', 'in_progress', 'on_hold')
    AND metadata ->> 'source' = 'system_audit_agent'
    AND NULLIF(metadata ->> 'systemAuditTaskKey', '') IS NOT NULL;
COMMIT;
