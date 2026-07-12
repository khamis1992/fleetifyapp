-- The hardened cancellation command is intentionally retained during rollback.
-- Restoring the previous function would sever payment history and ignore active
-- allocation-ledger links. No table or column was added by this migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc procedure
    JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'cancel_invoice_with_reversal'
  ) THEN
    RAISE EXCEPTION 'Hardened invoice cancellation function is missing';
  END IF;
END;
$$;
