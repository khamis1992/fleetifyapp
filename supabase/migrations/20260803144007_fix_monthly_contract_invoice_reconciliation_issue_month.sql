-- Use the canonical invoice issue month during monthly reconciliation.
-- due_date is a payment deadline and must not reserve another billing month.

BEGIN;

-- Stop before replacing the existing guard if canonical active-month duplicates
-- already exist. This migration intentionally does not rewrite financial data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.contract_id IS NOT NULL
      AND COALESCE(invoice.invoice_month, invoice.invoice_date) IS NOT NULL
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
    GROUP BY
      invoice.contract_id,
      date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot install canonical invoice-month constraint while active canonical-month duplicates exist';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_duplicate_monthly_invoice ON public.invoices;
DROP INDEX IF EXISTS public.idx_invoices_unique_contract_month;

CREATE UNIQUE INDEX idx_invoices_unique_contract_month
  ON public.invoices (
    contract_id,
    (
      date_trunc(
        'month',
        COALESCE(invoice_month, invoice_date)::timestamp without time zone
      )::date
    )
  )
  WHERE contract_id IS NOT NULL
    AND COALESCE(invoice_month, invoice_date) IS NOT NULL
    AND lower(COALESCE(status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
    AND lower(COALESCE(payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    );

CREATE OR REPLACE FUNCTION public.check_duplicate_monthly_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice_month date;
  v_existing_invoice_number text;
BEGIN
  IF NEW.contract_id IS NULL
     OR COALESCE(NEW.invoice_month, NEW.invoice_date) IS NULL
     OR lower(COALESCE(NEW.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
     OR lower(COALESCE(NEW.payment_status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
  THEN
    RETURN NEW;
  END IF;

  v_invoice_month := date_trunc(
    'month',
    COALESCE(NEW.invoice_month, NEW.invoice_date)::timestamp without time zone
  )::date;

  SELECT invoice.invoice_number
  INTO v_existing_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = NEW.company_id
    AND invoice.contract_id = NEW.contract_id
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date = v_invoice_month
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
    AND invoice.id <> COALESCE(
      NEW.id,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  ORDER BY invoice.id
  LIMIT 1;

  IF v_existing_invoice_number IS NOT NULL THEN
    RAISE EXCEPTION
      'An active invoice (%) already exists for this contract canonical month %',
      v_existing_invoice_number,
      to_char(v_invoice_month, 'YYYY-MM')
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_duplicate_monthly_invoice
  BEFORE INSERT OR UPDATE OF
    company_id,
    contract_id,
    invoice_month,
    invoice_date,
    status,
    payment_status
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_duplicate_monthly_invoice();

CREATE OR REPLACE FUNCTION public.generate_invoice_for_contract_month(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
  v_schedule_id uuid;
  v_actor uuid := auth.uid();
  v_jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
  -- SECURITY DEFINER changes current_user; session_user retains the trusted
  -- connection identity used by direct pg_cron/database invocations.
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
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

  IF NOT v_trusted_direct_session AND v_jwt_role <> 'service_role' THEN
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
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = p_contract_id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = p_invoice_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT schedule.id, schedule.amount, schedule.due_date
  INTO v_schedule_id, v_total_amount, v_invoice_date
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = p_contract_id
    AND schedule.company_id = v_contract.company_id
    AND date_trunc('month', schedule.due_date)::date = p_invoice_month
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
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

CREATE OR REPLACE FUNCTION public.monthly_contract_invoice_reconciliation(
  p_target_month date DEFAULT date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date
)
RETURNS TABLE (
  company_id uuid,
  contract_id uuid,
  contract_number text,
  invoice_month date,
  action text,
  invoice_id uuid,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_contract record;
  v_invoice_id uuid;
  v_amount numeric;
  v_month date := date_trunc('month', p_target_month)::date;
BEGIN
  FOR v_contract IN
    SELECT
      contract.id,
      contract.company_id,
      contract.contract_number,
      contract.customer_id,
      contract.start_date,
      contract.end_date,
      contract.monthly_amount,
      contract.contract_amount,
      contract.status
    FROM public.contracts contract
    JOIN public.companies company ON company.id = contract.company_id
    WHERE contract.status IN ('active', 'under_legal_procedure')
      AND contract.start_date IS NOT NULL
      AND date_trunc('month', contract.start_date + INTERVAL '1 month')::date <= v_month
      AND (contract.end_date IS NULL OR date_trunc('month', contract.end_date)::date >= v_month)
      AND (company.subscription_status = 'active' OR company.subscription_status IS NULL)
      AND (company.subscription_expires_at IS NULL OR company.subscription_expires_at > CURRENT_DATE)
    ORDER BY contract.company_id, contract.contract_number
  LOOP
    company_id := v_contract.company_id;
    contract_id := v_contract.id;
    contract_number := v_contract.contract_number;
    invoice_month := v_month;
    invoice_id := NULL;

    v_amount := COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0);
    IF v_amount <= 0 THEN
      action := 'skipped';
      message := 'missing_monthly_amount';
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT invoice.id
    INTO invoice_id
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled',
        'canceled',
        'void',
        'voided',
        'deleted'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled',
        'canceled',
        'void',
        'voided',
        'deleted'
      )
    ORDER BY invoice.id
    LIMIT 1;

    IF invoice_id IS NOT NULL THEN
      action := 'existing';
      message := 'invoice_already_exists';
      RETURN NEXT;
      CONTINUE;
    END IF;

    BEGIN
      v_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
      invoice_id := v_invoice_id;

      IF v_invoice_id IS NULL THEN
        action := 'skipped';
        message := 'generator_returned_no_invoice';
      ELSE
        action := 'created';
        message := 'invoice_created';
      END IF;

      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      action := 'error';
      message := SQLERRM;
      invoice_id := NULL;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  TO service_role;

COMMENT ON INDEX public.idx_invoices_unique_contract_month IS
  'Enforces one active invoice per contract canonical month using invoice_month with invoice_date fallback.';

COMMENT ON FUNCTION public.check_duplicate_monthly_invoice() IS
  'Rejects duplicate active contract invoices by canonical invoice_month/invoice_date month.';

COMMENT ON FUNCTION public.generate_invoice_for_contract_month(uuid, date) IS
  'Atomically creates one tenant-authorized canonical-month contract invoice; trusted postgres/supabase_admin sessions support direct pg_cron execution.';

COMMENT ON FUNCTION public.monthly_contract_invoice_reconciliation(date) IS
'Creates missing contract invoices for one canonical issue month using invoice_month/invoice_date only; intended for pg_cron on the 28th to generate next month.';

COMMIT;
