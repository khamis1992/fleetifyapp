BEGIN;

CREATE OR REPLACE FUNCTION public.generate_invoice_for_contract_month(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
BEGIN
  SELECT * INTO v_contract FROM public.contracts contract WHERE contract.id = p_contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found: %', p_contract_id; END IF;

  p_invoice_month := date_trunc('month', p_invoice_month)::date;
  IF v_contract.start_date > (p_invoice_month + interval '1 month - 1 day')::date
     OR (v_contract.end_date IS NOT NULL AND v_contract.end_date < p_invoice_month)
  THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_contract.company_id::text || ':' || p_contract_id::text || ':' || to_char(p_invoice_month, 'YYYY-MM'), 0)
  );
  IF EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.contract_id = p_contract_id
      AND date_trunc('month', invoice.invoice_date)::date = p_invoice_month
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT schedule.amount, schedule.due_date
  INTO v_total_amount, v_invoice_date
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = p_contract_id
    AND schedule.company_id = v_contract.company_id
    AND date_trunc('month', schedule.due_date)::date = p_invoice_month
    AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ORDER BY schedule.id
  LIMIT 1;
  v_total_amount := COALESCE(v_total_amount, v_contract.monthly_amount, v_contract.contract_amount, 0);
  v_invoice_date := greatest(COALESCE(v_invoice_date, p_invoice_month), v_contract.start_date);
  IF v_total_amount <= 0.01 THEN RAISE EXCEPTION 'Contract invoice amount must be positive'; END IF;

  SELECT 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-' ||
         lpad((COALESCE(MAX(CAST(substring(invoice.invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS integer)), 0) + 1)::text, 5, '0')
  INTO v_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.invoice_number LIKE 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-%';

  INSERT INTO public.invoices (
    company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
    total_amount, subtotal, tax_amount, discount_amount, paid_amount, balance_due,
    status, payment_status, invoice_type, notes, created_at, updated_at
  ) VALUES (
    v_contract.company_id, v_contract.customer_id, v_contract.id, v_invoice_number,
    v_invoice_date, v_invoice_date, v_total_amount, v_total_amount, 0, 0, 0, v_total_amount,
    'sent', 'unpaid', 'service',
    'Generated for contract billing month ' || to_char(p_invoice_month, 'YYYY-MM'), now(), now()
  ) RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  TO PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.generate_invoice_for_contract_month(uuid, date) IS
  'Generates one contract invoice by canonical invoice_date month using the matching schedule amount.';

COMMIT;
