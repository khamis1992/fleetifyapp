-- Make monthly contract invoice generation tenant-safe, atomic, and complete.

BEGIN;
CREATE OR REPLACE FUNCTION public.generate_invoice_for_contract_month(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
  v_schedule_id uuid;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_company_currency text;
BEGIN
  IF p_contract_id IS NULL OR p_invoice_month IS NULL THEN
    RAISE EXCEPTION 'Contract and invoice month are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'Authentication is required to generate invoices' USING ERRCODE = '42501';
    END IF;
    IF public.get_user_company_id() IS DISTINCT FROM v_contract.company_id THEN
      RAISE EXCEPTION 'Not authorized to generate invoices for this company' USING ERRCODE = '42501';
    END IF;
  END IF;

  p_invoice_month := date_trunc('month', p_invoice_month)::date;
  IF v_contract.start_date > (p_invoice_month + interval '1 month - 1 day')::date
     OR v_contract.end_date < p_invoice_month
  THEN
    RETURN NULL;
  END IF;

  -- A company/month lock also protects the sequential invoice number.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_contract.company_id::text || ':invoice:' || to_char(p_invoice_month, 'YYYY-MM'), 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.contract_id = p_contract_id
      AND date_trunc('month', invoice.invoice_date)::date = p_invoice_month
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT schedule.id, schedule.amount, schedule.due_date
  INTO v_schedule_id, v_total_amount, v_invoice_date
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = p_contract_id
    AND schedule.company_id = v_contract.company_id
    AND date_trunc('month', schedule.due_date)::date = p_invoice_month
    AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ORDER BY schedule.installment_number NULLS LAST, schedule.due_date, schedule.id
  LIMIT 1;

  v_total_amount := COALESCE(v_total_amount, v_contract.monthly_amount, v_contract.contract_amount, 0);
  v_invoice_date := greatest(COALESCE(v_invoice_date, p_invoice_month), v_contract.start_date);
  IF v_total_amount <= 0.01 THEN
    RAISE EXCEPTION 'Contract invoice amount must be positive' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(NULLIF(company.currency, ''), 'QAR')
  INTO v_company_currency
  FROM public.companies company
  WHERE company.id = v_contract.company_id;

  SELECT 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-' ||
         lpad((COALESCE(MAX(CAST(substring(invoice.invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS integer)), 0) + 1)::text, 5, '0')
  INTO v_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.invoice_number LIKE 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-%';

  INSERT INTO public.invoices (
    company_id, customer_id, contract_id, cost_center_id, invoice_number,
    invoice_date, invoice_month, due_date, total_amount, subtotal, tax_amount,
    discount_amount, paid_amount, balance_due, status, payment_status,
    invoice_type, currency, notes, created_by, created_at, updated_at
  ) VALUES (
    v_contract.company_id, v_contract.customer_id, v_contract.id, v_contract.cost_center_id,
    v_invoice_number, v_invoice_date, p_invoice_month, v_invoice_date,
    v_total_amount, v_total_amount, 0, 0, 0, v_total_amount,
    'sent', 'unpaid', 'service', COALESCE(v_company_currency, 'QAR'),
    'Generated for contract billing month ' || to_char(p_invoice_month, 'YYYY-MM'),
    v_actor, now(), now()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, line_number, item_description, item_description_ar,
    quantity, unit_price, line_total, tax_rate, tax_amount, cost_center_id
  ) VALUES (
    v_invoice_id, 1,
    'Monthly rental payment - ' || to_char(p_invoice_month, 'YYYY-MM'),
    'قسط إيجار شهري - ' || to_char(p_invoice_month, 'YYYY-MM'),
    1, v_total_amount, v_total_amount, 0, 0, v_contract.cost_center_id
  );

  IF v_schedule_id IS NOT NULL THEN
    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = v_invoice_id,
        updated_at = now()
    WHERE schedule.id = v_schedule_id
      AND schedule.company_id = v_contract.company_id;
  END IF;

  RETURN v_invoice_id;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.generate_invoice_for_contract_month(uuid, date) IS
  'Atomically creates one tenant-authorized contract invoice, its line item, and its monthly schedule link.';
COMMIT;
