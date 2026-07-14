DROP TRIGGER IF EXISTS validate_payment_before_insert_or_update ON public.payments;
CREATE TRIGGER validate_payment_before_insert_or_update
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_before_insert_or_update();

COMMENT ON FUNCTION public.validate_payment_before_insert_or_update() IS
'Legacy payment validation restored by rollback of migration 20260712055800.';
