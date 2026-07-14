-- Restore the previous recalculation implementation.
CREATE OR REPLACE FUNCTION public.recalculate_invoice_financial_state(p_invoice_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_paid := public.canonical_invoice_paid_amount(p_invoice_id, NULL);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.invoices invoice
  SET
    paid_amount = v_paid,
    balance_due = GREATEST(COALESCE(v_invoice.total_amount, 0) - v_paid, 0),
    payment_status = CASE
      WHEN v_paid <= 0.01 THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      ELSE 'partial'
    END,
    status = CASE
      WHEN lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
        THEN v_invoice.status
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date < CURRENT_DATE THEN 'overdue'
      WHEN lower(COALESCE(v_invoice.status, '')) = 'draft' THEN 'draft'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE invoice.id = p_invoice_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_paid;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_invoice_financial_state(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_invoice_financial_state(uuid)
  TO service_role;
