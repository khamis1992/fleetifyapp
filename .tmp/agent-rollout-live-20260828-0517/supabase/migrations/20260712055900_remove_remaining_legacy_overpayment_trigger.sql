-- This remaining legacy trigger validates every UPDATE as a new receipt by
-- adding NEW.amount to contracts.total_paid. It conflicts with canonical
-- allocation synchronization, which does not change the receipt amount.

DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON public.payments;
COMMENT ON FUNCTION public.validate_payment_amount() IS
'Legacy validation retained for rollback compatibility. Its trigger is disabled because canonical payment controls validate real amount/status mutations without double-counting allocation-only updates.';
