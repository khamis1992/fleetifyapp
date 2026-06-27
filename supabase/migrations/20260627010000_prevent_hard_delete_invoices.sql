-- Prevent financial history loss: invoices must be cancelled, not hard deleted.
CREATE OR REPLACE FUNCTION public.prevent_invoices_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Invoices cannot be deleted permanently. Set status = cancelled instead.'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS prevent_invoices_hard_delete_trigger ON public.invoices;

CREATE TRIGGER prevent_invoices_hard_delete_trigger
BEFORE DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.prevent_invoices_hard_delete();
