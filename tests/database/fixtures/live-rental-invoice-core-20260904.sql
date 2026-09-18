-- Read-only production snapshot; pg_get_functiondef MD5 d7972cf4eac7f73a3e1e3d33efb0a2f0.
-- The core deliberately writes rental invoices as service. Do not infer non-rental from that type.
CREATE OR REPLACE FUNCTION public.system_generate_invoice_for_contract_month_core(p_contract_id uuid, p_invoice_month date)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
  v_schedule_id uuid;
  v_actor uuid := auth.uid();
  v_company_currency text;
  v_month date := date_trunc('month', p_invoice_month)::date;
BEGIN
  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.start_date > (v_month + interval '1 month - 1 day')::date
     OR v_contract.end_date < v_month
  THEN
    RETURN NULL;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_contract.company_id::text || ':invoice:' || to_char(v_month, 'YYYY-MM'),
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT schedule.id, schedule.amount, schedule.due_date
  INTO v_schedule_id, v_total_amount, v_invoice_date
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = v_contract.id
    AND schedule.company_id = v_contract.company_id
    AND date_trunc('month', schedule.due_date)::date = v_month
    AND COALESCE(schedule.amount, 0) > 0.01
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY schedule.installment_number NULLS LAST, schedule.due_date, schedule.id
  LIMIT 1
  FOR UPDATE OF schedule;

  IF v_schedule_id IS NULL OR COALESCE(v_total_amount, 0) <= 0.01 THEN
    RAISE EXCEPTION 'Contract month requires one positive active schedule'
      USING ERRCODE = 'P0001';
  END IF;

  v_invoice_date := greatest(v_invoice_date, v_contract.start_date);

  SELECT COALESCE(NULLIF(company.currency, ''), 'QAR')
  INTO v_company_currency
  FROM public.companies company
  WHERE company.id = v_contract.company_id;

  SELECT 'INV-' || to_char(v_month, 'YYYYMM') || '-' ||
         lpad((COALESCE(MAX(CAST(substring(invoice.invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS integer)), 0) + 1)::text, 5, '0')
  INTO v_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.invoice_number LIKE 'INV-' || to_char(v_month, 'YYYYMM') || '-%';

  INSERT INTO public.invoices (
    company_id, customer_id, contract_id, cost_center_id, invoice_number,
    invoice_date, invoice_month, due_date, total_amount, subtotal, tax_amount,
    discount_amount, paid_amount, balance_due, status, payment_status,
    invoice_type, currency, notes, created_by, created_at, updated_at
  ) VALUES (
    v_contract.company_id, v_contract.customer_id, v_contract.id, v_contract.cost_center_id,
    v_invoice_number, v_invoice_date, v_month, v_invoice_date,
    v_total_amount, v_total_amount, 0, 0, 0, v_total_amount,
    'sent', 'unpaid', 'service', COALESCE(v_company_currency, 'QAR'),
    'Generated for contract billing month ' || to_char(v_month, 'YYYY-MM'),
    v_actor, now(), now()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, line_number, item_description, item_description_ar,
    quantity, unit_price, line_total, tax_rate, tax_amount, cost_center_id
  ) VALUES (
    v_invoice_id, 1,
    'Monthly rental payment - ' || to_char(v_month, 'YYYY-MM'),
    'قسط إيجار شهري - ' || to_char(v_month, 'YYYY-MM'),
    1, v_total_amount, v_total_amount, 0, 0, v_contract.cost_center_id
  );

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = v_invoice_id,
      updated_at = now()
  WHERE schedule.id = v_schedule_id
    AND schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id;

  RETURN v_invoice_id;
END;
$function$

