-- Prevent financial history loss: payments must be cancelled, not hard deleted.
CREATE OR REPLACE FUNCTION public.prevent_payments_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Payments cannot be deleted permanently. Set payment_status = cancelled instead.'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS prevent_payments_hard_delete_trigger ON public.payments;

CREATE TRIGGER prevent_payments_hard_delete_trigger
BEFORE DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_payments_hard_delete();
