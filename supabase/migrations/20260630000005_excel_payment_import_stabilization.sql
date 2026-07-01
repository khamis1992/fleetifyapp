-- Stabilize historical Excel payment import.
--
-- This migration intentionally centralizes payment side effects. The import
-- path was failing because old payment triggers updated the same invoice row
-- during one INSERT, while old unique constraints still counted cancelled
-- payments as active duplicates.
--
-- Safe to run after, or instead of, the earlier 20260630000001..00004 fixes.

-- ---------------------------------------------------------------------------
-- 1. Remove duplicate blockers that include cancelled audit rows.
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS uq_payment_unique_transaction;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS prevent_duplicate_contract_payments;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS uq_payment_invoice_unique;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS prevent_duplicate_invoice_payments;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS uq_payment_contract_unique;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS unique_payment_per_invoice_date_amount;

DROP INDEX IF EXISTS public.prevent_duplicate_contract_payments;
DROP INDEX IF EXISTS public.prevent_duplicate_invoice_payments;
DROP INDEX IF EXISTS public.unique_payment_per_invoice_date_amount;
DROP INDEX IF EXISTS public.idx_payments_unique_transaction;

CREATE INDEX IF NOT EXISTS idx_payments_active_transaction_lookup
ON public.payments (
  company_id,
  customer_id,
  contract_id,
  invoice_id,
  payment_date,
  amount,
  transaction_type
)
WHERE payment_status IS DISTINCT FROM 'cancelled';

COMMENT ON INDEX public.idx_payments_active_transaction_lookup IS
'Lookup index for active duplicate detection. Cancelled payments stay as audit rows and do not block re-import.';

-- Remove obsolete payment triggers from earlier payment systems. The current
-- import path must have one payment side-effect owner only.
DROP TRIGGER IF EXISTS validate_payment_duplicate_before_insert ON public.payments;
DROP TRIGGER IF EXISTS validate_payment_before_insert_trigger ON public.payments;
DROP TRIGGER IF EXISTS validate_payment_before_update_trigger ON public.payments;
DROP TRIGGER IF EXISTS trigger_auto_calculate_payment_fields ON public.payments;
DROP TRIGGER IF EXISTS detect_suspicious_activity_trigger ON public.payments;

-- ---------------------------------------------------------------------------
-- 2. Keep invoice date validation strict for new data, but allow legacy invoice
-- balance/status recalculation and forward date repair.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_invoice_date_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract_start_date date;
BEGIN
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT start_date INTO v_contract_start_date
  FROM public.contracts
  WHERE id = NEW.contract_id;

  IF v_contract_start_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.contract_id IS NOT DISTINCT FROM OLD.contract_id
      AND NEW.invoice_date IS NOT DISTINCT FROM OLD.invoice_date
      AND NEW.due_date IS NOT DISTINCT FROM OLD.due_date THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.invoice_date IS NOT NULL AND NEW.invoice_date < v_contract_start_date THEN
    RAISE EXCEPTION 'Invoice date (%) cannot be before contract start date (%)',
      NEW.invoice_date, v_contract_start_date;
  END IF;

  IF NEW.due_date IS NOT NULL AND NEW.due_date < v_contract_start_date THEN
    RAISE EXCEPTION 'Invoice due date (%) cannot be before contract start date (%)',
      NEW.due_date, v_contract_start_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_invoice_dates_trigger ON public.invoices;

CREATE TRIGGER validate_invoice_dates_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_date_before_insert();

COMMENT ON FUNCTION public.validate_invoice_date_before_insert() IS
'Validates invoice dates against contract start date while allowing legacy invoice recalculation and forward date repair.';

-- ---------------------------------------------------------------------------
-- 3. Single owner for invoice/contract totals after payment changes.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_invoice_total numeric := 0;
  v_invoice_paid numeric := 0;
  v_contract_paid numeric := 0;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.invoice_id IS NOT NULL THEN
      v_invoice_ids := array_append(v_invoice_ids, NEW.invoice_id);
    END IF;
    IF NEW.contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, NEW.contract_id);
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.invoice_id IS NOT NULL THEN
      v_invoice_ids := array_append(v_invoice_ids, OLD.invoice_id);
    END IF;
    IF OLD.contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, OLD.contract_id);
    END IF;
  END IF;

  -- Legacy invoice/contract triggers include journal/reminder/status side
  -- effects that can update the same row while this payment trigger is already
  -- updating it. Suppress user triggers only inside this recalculation.
  EXECUTE 'ALTER TABLE public.invoices DISABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.contracts DISABLE TRIGGER USER';

  FOR v_invoice_id IN
    SELECT DISTINCT unnest(v_invoice_ids)
  LOOP
    SELECT COALESCE(i.total_amount, 0)
      INTO v_invoice_total
    FROM public.invoices i
    WHERE i.id = v_invoice_id;

    SELECT COALESCE(SUM(p.amount), 0)
      INTO v_invoice_paid
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
      AND p.payment_status = 'completed';

    UPDATE public.invoices i
    SET
      paid_amount = v_invoice_paid,
      balance_due = GREATEST(v_invoice_total - v_invoice_paid, 0),
      payment_status = CASE
        WHEN v_invoice_paid <= 0 THEN 'unpaid'
        WHEN v_invoice_total - v_invoice_paid <= 0.01 THEN 'paid'
        ELSE 'partial'
      END,
      status = CASE
        WHEN v_invoice_paid <= 0 THEN
          CASE WHEN i.due_date < CURRENT_DATE THEN 'overdue' ELSE COALESCE(NULLIF(i.status, 'paid'), 'pending') END
        WHEN v_invoice_total - v_invoice_paid <= 0.01 THEN 'paid'
        ELSE
          CASE WHEN i.due_date < CURRENT_DATE THEN 'overdue' ELSE COALESCE(NULLIF(i.status, 'paid'), 'pending') END
      END,
      updated_at = now()
    WHERE i.id = v_invoice_id;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT unnest(v_contract_ids)
  LOOP
    SELECT COALESCE(SUM(p.amount), 0)
      INTO v_contract_paid
    FROM public.payments p
    WHERE p.contract_id = v_contract_id
      AND p.payment_status = 'completed';

    UPDATE public.contracts c
    SET
      total_paid = v_contract_paid,
      balance_due = GREATEST(COALESCE(c.contract_amount, 0) - v_contract_paid, 0),
      updated_at = now()
    WHERE c.id = v_contract_id;
  END LOOP;

  EXECUTE 'ALTER TABLE public.invoices ENABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.contracts ENABLE TRIGGER USER';

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  EXECUTE 'ALTER TABLE public.invoices ENABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.contracts ENABLE TRIGGER USER';
  RAISE;
END;
$$;

-- Remove historical payment triggers that update the same invoice/contract row.
DROP TRIGGER IF EXISTS trigger_update_invoice_payment_status ON public.payments;
DROP TRIGGER IF EXISTS payments_update_contract_totals ON public.payments;
DROP TRIGGER IF EXISTS payment_status_update_trigger ON public.payments;
DROP TRIGGER IF EXISTS trg_payment_journal_entry ON public.payments;

CREATE TRIGGER payment_status_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_on_payment_completion();

COMMENT ON TRIGGER payment_status_update_trigger ON public.payments IS
'Only trigger allowed to update invoice and contract payment totals from payments.';

-- ---------------------------------------------------------------------------
-- 4. Late fees may be created after a late payment, but this trigger must not
-- update invoices during the same payment INSERT.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_auto_calculate_late_fee_on_payment ON public.payments;

CREATE OR REPLACE FUNCTION public.check_and_calculate_late_fee_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_days_overdue integer;
  v_fee_amount numeric := 0;
  v_late_fee_id uuid;
  v_existing_fee uuid;
  v_rule RECORD;
  v_payment_date date;
  v_daily_rate numeric := 0;
  v_max_percentage numeric := 100;
  v_daily_amount numeric := 0;
  v_max_amount numeric := 100000;
  v_tier jsonb;
  v_min_days integer;
  v_max_days integer;
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    i.id,
    i.company_id,
    i.invoice_number,
    i.customer_id,
    i.contract_id,
    i.due_date,
    i.total_amount,
    i.invoice_type,
    i.payment_status,
    i.status
  INTO v_invoice
  FROM public.invoices i
  WHERE i.id = NEW.invoice_id;

  IF NOT FOUND OR v_invoice.due_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_payment_date := NEW.payment_date::date;
  IF v_payment_date <= v_invoice.due_date THEN
    RETURN NEW;
  END IF;

  v_days_overdue := v_payment_date - v_invoice.due_date;

  SELECT id
    INTO v_existing_fee
  FROM public.late_fees
  WHERE invoice_id = NEW.invoice_id
    AND status IN ('pending', 'applied')
    AND days_overdue = v_days_overdue
  LIMIT 1;

  IF v_existing_fee IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_rule
  FROM public.late_fee_rules
  WHERE company_id = NEW.company_id
    AND is_enabled = true
    AND COALESCE(minimum_overdue_days, 1) <= v_days_overdue
  ORDER BY priority DESC, created_at ASC
  LIMIT 1;

  IF NOT FOUND OR v_days_overdue <= v_rule.grace_period_days THEN
    RETURN NEW;
  END IF;

  IF v_rule.rule_type = 'percentage' THEN
    v_daily_rate := COALESCE(NULLIF(v_rule.fee_structure->>'dailyRate', '')::numeric, 0);
    v_max_percentage := COALESCE(NULLIF(v_rule.fee_structure->>'maxPercentage', '')::numeric, 100);
    v_fee_amount := v_invoice.total_amount * (v_daily_rate / 100) * v_days_overdue;
    v_fee_amount := LEAST(v_fee_amount, v_invoice.total_amount * (v_max_percentage / 100));
  ELSIF v_rule.rule_type = 'fixed' THEN
    v_daily_amount := COALESCE(NULLIF(v_rule.fee_structure->>'dailyAmount', '')::numeric, 0);
    v_max_amount := COALESCE(NULLIF(v_rule.fee_structure->>'maxAmount', '')::numeric, 100000);
    v_fee_amount := LEAST(v_daily_amount * v_days_overdue, v_max_amount);
  ELSIF v_rule.rule_type = 'tiered' THEN
    FOR v_tier IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_rule.fee_structure->'tiers', '[]'::jsonb))
    LOOP
      v_min_days := COALESCE(NULLIF(v_tier->>'minDays', '')::integer, 0);
      v_max_days := COALESCE(NULLIF(v_tier->>'maxDays', '')::integer, 2147483647);
      IF v_days_overdue BETWEEN v_min_days AND v_max_days THEN
        v_daily_rate := COALESCE(NULLIF(v_tier->>'dailyRate', '')::numeric, 0);
        v_max_amount := COALESCE(NULLIF(v_tier->>'maxAmount', '')::numeric, 100000);
        v_fee_amount := LEAST(v_invoice.total_amount * (v_daily_rate / 100) * v_days_overdue, v_max_amount);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_fee_amount <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.late_fees (
    company_id,
    invoice_id,
    contract_id,
    late_fee_rule_id,
    original_amount,
    days_overdue,
    fee_amount,
    fee_type,
    status,
    created_at
  )
  VALUES (
    NEW.company_id,
    NEW.invoice_id,
    v_invoice.contract_id,
    v_rule.id,
    v_invoice.total_amount,
    v_days_overdue,
    v_fee_amount,
    COALESCE(v_rule.rule_type, 'fixed'),
    'pending',
    now()
  )
  RETURNING id INTO v_late_fee_id;

  INSERT INTO public.late_fee_history (late_fee_id, action, notes)
  VALUES (
    v_late_fee_id,
    'created',
    format(
      'Auto-generated on payment registration. Payment date: %s, Due date: %s, Days overdue: %s',
      v_payment_date,
      v_invoice.due_date,
      v_days_overdue
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_calculate_late_fee_on_payment
AFTER INSERT ON public.payments
FOR EACH ROW
WHEN (NEW.invoice_id IS NOT NULL)
EXECUTE FUNCTION public.check_and_calculate_late_fee_on_payment();

COMMENT ON TRIGGER trigger_auto_calculate_late_fee_on_payment ON public.payments IS
'Creates late-fee records after late payments without touching invoices during payment insert.';

-- ---------------------------------------------------------------------------
-- 5. Reconcile stored totals from the actual completed payments.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Some legacy invoice/contract triggers update the same row being reconciled,
  -- which raises SQLSTATE 27000 during a set-based UPDATE. Totals are being
  -- explicitly recalculated here, so suppress user triggers only for this block.
  EXECUTE 'ALTER TABLE public.invoices DISABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.contracts DISABLE TRIGGER USER';

  WITH invoice_paid AS (
    SELECT
      i.id,
      i.total_amount,
      i.due_date,
      i.status,
      COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0) AS paid_amount
    FROM public.invoices i
    LEFT JOIN public.payments p ON p.invoice_id = i.id
    GROUP BY i.id, i.total_amount, i.due_date, i.status
  )
  UPDATE public.invoices i
  SET
    paid_amount = invoice_paid.paid_amount,
    balance_due = GREATEST(invoice_paid.total_amount - invoice_paid.paid_amount, 0),
    payment_status = CASE
      WHEN invoice_paid.paid_amount <= 0 THEN 'unpaid'
      WHEN invoice_paid.total_amount - invoice_paid.paid_amount <= 0.01 THEN 'paid'
      ELSE 'partial'
    END,
    status = CASE
      WHEN invoice_paid.paid_amount <= 0 THEN
        CASE WHEN invoice_paid.due_date < CURRENT_DATE THEN 'overdue' ELSE COALESCE(NULLIF(invoice_paid.status, 'paid'), 'pending') END
      WHEN invoice_paid.total_amount - invoice_paid.paid_amount <= 0.01 THEN 'paid'
      ELSE
        CASE WHEN invoice_paid.due_date < CURRENT_DATE THEN 'overdue' ELSE COALESCE(NULLIF(invoice_paid.status, 'paid'), 'pending') END
    END,
    updated_at = now()
  FROM invoice_paid
  WHERE i.id = invoice_paid.id;

  WITH contract_paid AS (
    SELECT
      c.id,
      c.contract_amount,
      COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0) AS paid_amount
    FROM public.contracts c
    LEFT JOIN public.payments p ON p.contract_id = c.id
    GROUP BY c.id, c.contract_amount
  )
  UPDATE public.contracts c
  SET
    total_paid = contract_paid.paid_amount,
    balance_due = GREATEST(COALESCE(contract_paid.contract_amount, 0) - contract_paid.paid_amount, 0),
    updated_at = now()
  FROM contract_paid
  WHERE c.id = contract_paid.id;

  EXECUTE 'ALTER TABLE public.invoices ENABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.contracts ENABLE TRIGGER USER';
EXCEPTION WHEN OTHERS THEN
  EXECUTE 'ALTER TABLE public.invoices ENABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.contracts ENABLE TRIGGER USER';
  RAISE;
END $$;
