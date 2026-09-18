-- Rollback: stop_penalty_invoice_generation
-- Restores automatic penalty invoice generation.

CREATE OR REPLACE FUNCTION public.ensure_penalty_contract_invoice(p_penalty_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_penalty public.penalties%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_date date;
  v_invoice_number text;
BEGIN
  SELECT penalty.* INTO v_penalty
  FROM public.penalties penalty
  WHERE penalty.id = p_penalty_id;

  IF NOT FOUND OR v_penalty.contract_id IS NULL OR COALESCE(v_penalty.amount, 0) <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT invoice.id INTO v_invoice_id
  FROM public.invoices invoice
  WHERE invoice.penalty_id = v_penalty.id;
  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;

  SELECT contract.* INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_penalty.contract_id
    AND contract.company_id = v_penalty.company_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_invoice_date := GREATEST(
    date_trunc('month', COALESCE(v_penalty.penalty_date, CURRENT_DATE))::date,
    date_trunc('month', COALESCE(v_contract.start_date, CURRENT_DATE))::date
  );
  v_invoice_number := 'TV-' || v_penalty.id::text;

  INSERT INTO public.invoices (
    company_id, customer_id, contract_id, penalty_id, invoice_number,
    invoice_date, invoice_month, due_date, subtotal, total_amount,
    tax_amount, discount_amount, paid_amount, balance_due, status,
    payment_status, invoice_type, notes, currency, created_by,
    manual_idempotency_key, created_at, updated_at
  ) VALUES (
    v_penalty.company_id,
    COALESCE(v_penalty.customer_id, v_contract.customer_id),
    v_penalty.contract_id,
    v_penalty.id,
    v_invoice_number,
    v_invoice_date,
    date_trunc('month', v_invoice_date)::date,
    date_trunc('month', v_invoice_date)::date,
    v_penalty.amount,
    v_penalty.amount,
    0, 0, 0, v_penalty.amount,
    'sent', 'unpaid', 'service',
    'مخالفة مرورية ' || COALESCE(v_penalty.penalty_number, v_penalty.id::text),
    'QAR', v_penalty.created_by,
    v_penalty.id,
    now(), now()
  )
  ON CONFLICT (penalty_id) WHERE penalty_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_invoice_id;

  IF v_invoice_id IS NULL THEN
    SELECT invoice.id INTO v_invoice_id FROM public.invoices invoice WHERE invoice.penalty_id = v_penalty.id;
  END IF;
  RETURN v_invoice_id;
END;
$$;

CREATE TRIGGER trg_penalty_contract_invoice_after_write
  AFTER INSERT OR UPDATE ON public.penalties
  FOR EACH ROW EXECUTE FUNCTION public.ensure_penalty_contract_invoice();