-- Contract summaries represent principal settled against the contract. Any
-- collection above the contract value remains in the payment/allocation ledger
-- for audit and reclassification, but must not inflate contracts.total_paid.

CREATE OR REPLACE FUNCTION public.recalculate_contract_financial_state(p_contract_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_canonical_paid numeric := 0;
  v_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_contract_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_canonical_paid := public.canonical_contract_paid_amount(p_contract_id);
  v_paid := CASE
    WHEN COALESCE(v_contract.contract_amount, 0) > 0
      THEN LEAST(v_canonical_paid, v_contract.contract_amount)
    ELSE v_canonical_paid
  END;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.contracts contract
  SET
    total_paid = v_paid,
    balance_due = GREATEST(COALESCE(v_contract.contract_amount, 0) - v_paid, 0),
    payment_status = CASE
      WHEN v_paid <= 0.01 THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_contract.contract_amount, 0) - 0.01 THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = now()
  WHERE contract.id = p_contract_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_paid;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
CREATE OR REPLACE FUNCTION public.after_payment_allocation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.sync_payment_allocation_state(OLD.payment_id);
    IF OLD.allocation_type = 'invoice' THEN
      PERFORM public.recalculate_invoice_financial_state(OLD.target_id);
      SELECT invoice.contract_id
      INTO v_contract_id
      FROM public.invoices invoice
      WHERE invoice.id = OLD.target_id;
      PERFORM public.recalculate_contract_financial_state(v_contract_id);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.sync_payment_allocation_state(NEW.payment_id);
    IF NEW.allocation_type = 'invoice' THEN
      PERFORM public.recalculate_invoice_financial_state(NEW.target_id);
      SELECT invoice.contract_id
      INTO v_contract_id
      FROM public.invoices invoice
      WHERE invoice.id = NEW.target_id;
      PERFORM public.recalculate_contract_financial_state(v_contract_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.recalculate_contract_financial_state(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_contract_financial_state(uuid)
  TO service_role;
