DO $repair$
DECLARE
  v_invoice_id uuid;
  v_paid numeric;
  v_invoice public.invoices%ROWTYPE;
BEGIN
  SELECT invoice.id
  INTO STRICT v_invoice_id
  FROM public.invoices invoice
  WHERE invoice.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
    AND invoice.invoice_number = 'INV-C-ALF-0045-025';

  v_paid := public.recalculate_invoice_financial_state(v_invoice_id);

  SELECT *
  INTO STRICT v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = v_invoice_id;

  IF abs(v_paid - 1050.00) >= 0.01
     OR abs(COALESCE(v_invoice.balance_due, 0)) >= 0.01
     OR v_invoice.payment_status <> 'paid'
     OR v_invoice.status <> 'paid'
  THEN
    RAISE EXCEPTION
      'Invoice repair verification failed: paid %, balance %, payment_status %, status %',
      v_paid,
      v_invoice.balance_due,
      v_invoice.payment_status,
      v_invoice.status;
  END IF;
END;
$repair$;
