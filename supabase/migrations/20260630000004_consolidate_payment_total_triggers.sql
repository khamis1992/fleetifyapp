-- A successful Excel payment insert can fire multiple historical payment
-- triggers. Some update invoices, some update contracts, and some old journal
-- triggers duplicate work now handled by the application. When two row-level
-- payment triggers update the same invoice during one INSERT, Postgres rejects
-- the command with:
-- "tuple to be updated was already modified by an operation triggered by the current command".
--
-- Keep a single authoritative trigger for invoice/contract payment totals.

DROP TRIGGER IF EXISTS trigger_update_invoice_payment_status ON public.payments;
DROP TRIGGER IF EXISTS payments_update_contract_totals ON public.payments;
DROP TRIGGER IF EXISTS payment_status_update_trigger ON public.payments;
DROP TRIGGER IF EXISTS trigger_auto_calculate_late_fee_on_payment ON public.payments;
DROP TRIGGER IF EXISTS trg_payment_journal_entry ON public.payments;

CREATE TRIGGER payment_status_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_on_payment_completion();

COMMENT ON TRIGGER payment_status_update_trigger ON public.payments IS
'Single payment totals trigger: recalculates invoice and contract balances from completed payments.';

-- Keep automatic late-fee creation, but do not update the invoice row from this
-- trigger. Invoice status/balance updates belong to payment_status_update_trigger.
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
'Creates late-fee records after late payments without updating the invoice row inside the payment INSERT.';
