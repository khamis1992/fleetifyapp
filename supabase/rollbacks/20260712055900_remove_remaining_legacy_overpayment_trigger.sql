DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON public.payments;
CREATE TRIGGER prevent_overpayment_trigger
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_amount();

COMMENT ON FUNCTION public.validate_payment_amount() IS
'Legacy payment overpayment validation restored by rollback of migration 20260712055900.';
