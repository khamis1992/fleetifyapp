-- The prior cache row is preserved in audit_logs action
-- thamer_7038_delinquency_cache_refreshed. Restore it only through a reviewed
-- compensating migration; automatic rollback could overwrite newer receipts.
DO $$
BEGIN
  RAISE EXCEPTION 'Automatic rollback refused: rebuild from the audited live ledger to avoid overwriting newer payments';
END;
$$;
