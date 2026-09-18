-- The legacy trigger adds NEW.amount to contracts.total_paid even on updates,
-- so allocation_status/invoice_id synchronization can be rejected as if a new
-- receipt were inserted. Canonical financial controls already validate real
-- payment amount/status mutations and recalculate totals atomically.

DROP TRIGGER IF EXISTS validate_payment_before_insert_or_update ON public.payments;
COMMENT ON FUNCTION public.validate_payment_before_insert_or_update() IS
'Legacy validation retained only for rollback compatibility. Its trigger is disabled because it double-counts unchanged completed payments during allocation synchronization.';
