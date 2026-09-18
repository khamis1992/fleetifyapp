-- Posted reversal entries cannot be safely undone automatically. The complete
-- before-state is in audit_logs action thamer_pyinv3_payment_placeholders_cancelled.
DO $$
BEGIN
  RAISE EXCEPTION 'Automatic rollback refused: use a reviewed compensating journal migration';
END;
$$;
