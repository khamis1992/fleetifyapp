-- Rollback intentionally restores privileges and trigger wiring only.
-- It does not recreate trigger-bypass functions because doing so would restore
-- a known integrity vulnerability. Restore previous function bodies from a
-- reviewed database backup if application rollback is required.

DROP TRIGGER IF EXISTS payment_totals_after_insert ON public.payments;
DROP TRIGGER IF EXISTS payment_totals_after_update ON public.payments;
DROP TRIGGER IF EXISTS payment_totals_after_delete ON public.payments;
DROP TRIGGER IF EXISTS payment_journal_before_insert ON public.payments;
DROP TRIGGER IF EXISTS payment_journal_before_completion ON public.payments;

CREATE TRIGGER payment_status_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_on_payment_completion();

CREATE TRIGGER trg_payment_journal_entry
AFTER INSERT OR UPDATE OF payment_status ON public.payments
FOR EACH ROW
WHEN (NEW.payment_status = 'completed')
EXECUTE FUNCTION public.trg_payment_journal_entry_fn();

REVOKE ALL ON FUNCTION public.repair_overpaid_invoice_allocations(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_overpaid_invoice_allocations(jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.restore_erroneously_cancelled_import_payments(uuid, boolean, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_erroneously_cancelled_import_payments(uuid, boolean, date)
  TO service_role;
