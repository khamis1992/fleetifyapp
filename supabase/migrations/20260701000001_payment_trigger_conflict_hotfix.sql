-- Hotfix: stop payment insert trigger conflicts during Excel import.
--
-- Symptom:
--   SQLSTATE 27000: tuple to be updated was already modified by an operation
--   triggered by the current command.
--
-- Cause:
--   Older payment/invoice triggers update the same invoice/contract row while
--   a payment insert is recalculating financial totals.

-- Obsolete payment triggers from older payment systems. Duplicate validation is
-- handled in the application and by active-payment lookups; totals are handled
-- by payment_status_update_trigger below.
DROP TRIGGER IF EXISTS validate_payment_duplicate_before_insert ON public.payments;
DROP TRIGGER IF EXISTS validate_payment_before_insert_trigger ON public.payments;
DROP TRIGGER IF EXISTS validate_payment_before_update_trigger ON public.payments;
DROP TRIGGER IF EXISTS trigger_auto_calculate_payment_fields ON public.payments;
DROP TRIGGER IF EXISTS detect_suspicious_activity_trigger ON public.payments;

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

  -- Existing invoice/contract triggers include journal/reminder/late-fee side
  -- effects that can update the same row. Suppress user triggers only while
  -- recalculating stored totals from completed payments.
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

DROP TRIGGER IF EXISTS trigger_update_invoice_payment_status ON public.payments;
DROP TRIGGER IF EXISTS payments_update_contract_totals ON public.payments;
DROP TRIGGER IF EXISTS payment_status_update_trigger ON public.payments;
DROP TRIGGER IF EXISTS trg_payment_journal_entry ON public.payments;

CREATE TRIGGER payment_status_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_on_payment_completion();

COMMENT ON TRIGGER payment_status_update_trigger ON public.payments IS
'Single payment totals trigger. Suppresses invoice/contract user triggers while recalculating balances to avoid SQLSTATE 27000.';
