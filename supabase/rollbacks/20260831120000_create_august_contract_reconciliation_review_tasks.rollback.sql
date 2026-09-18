-- Cancel only untouched pending tasks created by the August review migration.
-- In-progress or completed human work is preserved.

BEGIN;

UPDATE public.tasks task
SET status = 'cancelled',
    completed_at = now(),
    updated_at = now(),
    metadata = COALESCE(task.metadata, '{}'::jsonb) || jsonb_build_object(
      'cancelledByRollback', true,
      'cancelledByMigration', '20260831120000_create_august_contract_reconciliation_review_tasks.rollback'
    )
WHERE task.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
  AND task.status = 'pending'
  AND task.metadata ->> 'source' = 'august_contract_reconciliation_20260831'
  AND task.metadata ->> 'createdByMigration'
    = '20260831120000_create_august_contract_reconciliation_review_tasks';

COMMIT;
