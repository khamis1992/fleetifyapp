-- No destructive rollback: the forward migration only restores derived invoice
-- fields from the immutable active payment-allocation evidence. Reverting those
-- fields would deliberately reintroduce an inaccurate outstanding balance.
DO $verify$
DECLARE
  v_invoice_id uuid;
BEGIN
  SELECT invoice.id
  INTO v_invoice_id
  FROM public.invoices invoice
  WHERE invoice.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
    AND invoice.invoice_number = 'INV-C-ALF-0045-025';

  IF v_invoice_id IS NOT NULL THEN
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END IF;
END;
$verify$;
