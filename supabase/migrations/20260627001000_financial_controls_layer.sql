-- Financial controls layer
-- هدف هذه الطبقة: منع فقدان الأثر المالي، منع العمل على فترات مغلقة،
-- وتوفير فحص صحة مالي مركزي يمكن استدعاؤه من الواجهة والتقارير.

CREATE OR REPLACE FUNCTION public.financial_controls_bypass_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.financial_controls_bypass', true), '') = 'on';
$$;

CREATE OR REPLACE FUNCTION public.assert_financial_period_is_open(
  p_company_id uuid,
  p_entry_date date
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_period record;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN;
  END IF;

  IF p_company_id IS NULL OR p_entry_date IS NULL THEN
    RETURN;
  END IF;

  SELECT id, period_name, status
  INTO v_period
  FROM public.accounting_periods
  WHERE company_id = p_company_id
    AND p_entry_date BETWEEN start_date AND end_date
    AND LOWER(status) IN ('closed', 'locked')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Financial period "%" is %. Transactions dated % are locked.',
      v_period.period_name, v_period.status, p_entry_date
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_payment_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Payments cannot be deleted permanently. Cancel the payment to preserve the audit trail.'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS prevent_payments_hard_delete_trigger ON public.payments;
CREATE TRIGGER prevent_payments_hard_delete_trigger
BEFORE DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_payment_hard_delete();

CREATE OR REPLACE FUNCTION public.enforce_payment_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_total numeric;
  v_existing_paid numeric;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.payment_date);

    IF TG_OP = 'UPDATE'
      AND OLD.payment_status = 'completed'
      AND NEW.payment_status = 'completed'
      AND (
        NEW.amount IS DISTINCT FROM OLD.amount OR
        NEW.payment_date IS DISTINCT FROM OLD.payment_date OR
        NEW.company_id IS DISTINCT FROM OLD.company_id OR
        NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
        NEW.invoice_id IS DISTINCT FROM OLD.invoice_id OR
        NEW.contract_id IS DISTINCT FROM OLD.contract_id
      )
    THEN
      RAISE EXCEPTION 'Completed payments are immutable. Cancel and re-create the payment instead.'
        USING ERRCODE = 'P0001';
    END IF;

    IF NEW.payment_status = 'completed' AND NEW.invoice_id IS NOT NULL THEN
      SELECT total_amount
      INTO v_invoice_total
      FROM public.invoices
      WHERE id = NEW.invoice_id
        AND company_id = NEW.company_id;

      SELECT COALESCE(SUM(amount), 0)
      INTO v_existing_paid
      FROM public.payments
      WHERE invoice_id = NEW.invoice_id
        AND company_id = NEW.company_id
        AND payment_status = 'completed'
        AND id <> NEW.id;

      IF COALESCE(v_invoice_total, 0) > 0
        AND v_existing_paid + COALESCE(NEW.amount, 0) > v_invoice_total + 0.01
      THEN
        RAISE EXCEPTION 'Payment would overpay invoice by QAR %.',
          ROUND((v_existing_paid + COALESCE(NEW.amount, 0) - v_invoice_total)::numeric, 2)
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_payment_financial_controls_trigger ON public.payments;
CREATE TRIGGER enforce_payment_financial_controls_trigger
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payment_financial_controls();

CREATE OR REPLACE FUNCTION public.prevent_posted_journal_entry_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN OLD;
  END IF;

  IF LOWER(COALESCE(OLD.status, '')) = 'posted' THEN
    RAISE EXCEPTION 'Posted journal entries cannot be deleted. Create a reversal entry instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_posted_journal_entry_delete_trigger ON public.journal_entries;
CREATE TRIGGER prevent_posted_journal_entry_delete_trigger
BEFORE DELETE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_posted_journal_entry_delete();

CREATE OR REPLACE FUNCTION public.enforce_journal_entry_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.entry_date);

    IF ABS(COALESCE(NEW.total_debit, 0) - COALESCE(NEW.total_credit, 0)) > 0.01 THEN
      RAISE EXCEPTION 'Journal entry must be balanced before saving.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
    AND LOWER(COALESCE(OLD.status, '')) = 'posted'
    AND (
      NEW.entry_number IS DISTINCT FROM OLD.entry_number OR
      NEW.entry_date IS DISTINCT FROM OLD.entry_date OR
      NEW.company_id IS DISTINCT FROM OLD.company_id OR
      NEW.total_debit IS DISTINCT FROM OLD.total_debit OR
      NEW.total_credit IS DISTINCT FROM OLD.total_credit OR
      NEW.reference_type IS DISTINCT FROM OLD.reference_type OR
      NEW.reference_id IS DISTINCT FROM OLD.reference_id
    )
  THEN
    RAISE EXCEPTION 'Posted journal entries are immutable. Create a reversal entry instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_journal_entry_financial_controls_trigger ON public.journal_entries;
CREATE TRIGGER enforce_journal_entry_financial_controls_trigger
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_journal_entry_financial_controls();

CREATE OR REPLACE FUNCTION public.enforce_invoice_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.invoice_date);
  END IF;

  IF TG_OP = 'DELETE'
    AND (
      COALESCE(OLD.paid_amount, 0) > 0
      OR EXISTS (
        SELECT 1
        FROM public.payments p
        WHERE p.invoice_id = OLD.id
          AND p.payment_status = 'completed'
      )
      OR OLD.journal_entry_id IS NOT NULL
    )
  THEN
    RAISE EXCEPTION 'Invoices with payments or journal entries cannot be deleted. Cancel or credit them instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_financial_controls_trigger ON public.invoices;
CREATE TRIGGER enforce_invoice_financial_controls_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_invoice_financial_controls();

CREATE OR REPLACE FUNCTION public.get_financial_integrity_report(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  completed_payments AS (
    SELECT *
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.payment_status = 'completed'
  ),
  payment_journal_links AS (
    SELECT
      p.id,
      p.journal_entry_id,
      je.id AS reference_journal_entry_id
    FROM completed_payments p
    LEFT JOIN public.journal_entries je
      ON je.company_id = p.company_id
     AND je.reference_type = 'payment'
     AND je.reference_id = p.id
  ),
  invoice_payment_totals AS (
    SELECT
      i.id,
      i.invoice_number,
      i.total_amount,
      COALESCE(i.paid_amount, 0) AS recorded_paid_amount,
      COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'completed'), 0) AS actual_paid_amount
    FROM public.invoices i
    LEFT JOIN public.payments p
      ON p.invoice_id = i.id
     AND p.company_id = i.company_id
    WHERE i.company_id = p_company_id
    GROUP BY i.id, i.invoice_number, i.total_amount, i.paid_amount
  ),
  issue_rows AS (
    SELECT
      'completed_payment_without_journal'::text AS code,
      COUNT(*)::int AS issue_count,
      COALESCE(jsonb_agg(id) FILTER (WHERE id IS NOT NULL), '[]'::jsonb) AS sample
    FROM payment_journal_links
    WHERE journal_entry_id IS NULL
      AND reference_journal_entry_id IS NULL
    UNION ALL
    SELECT
      'unbalanced_journal_entries',
      COUNT(*)::int,
      COALESCE(jsonb_agg(id) FILTER (WHERE id IS NOT NULL), '[]'::jsonb)
    FROM public.journal_entries
    WHERE company_id = p_company_id
      AND ABS(COALESCE(total_debit, 0) - COALESCE(total_credit, 0)) > 0.01
    UNION ALL
    SELECT
      'invoice_paid_amount_mismatch',
      COUNT(*)::int,
      COALESCE(jsonb_agg(invoice_number) FILTER (WHERE invoice_number IS NOT NULL), '[]'::jsonb)
    FROM invoice_payment_totals
    WHERE ABS(recorded_paid_amount - actual_paid_amount) > 0.01
    UNION ALL
    SELECT
      'overpaid_invoices',
      COUNT(*)::int,
      COALESCE(jsonb_agg(invoice_number) FILTER (WHERE invoice_number IS NOT NULL), '[]'::jsonb)
    FROM invoice_payment_totals
    WHERE actual_paid_amount > total_amount + 0.01
  )
  SELECT jsonb_build_object(
    'checked_at', now(),
    'company_id', p_company_id,
    'summary', jsonb_build_object(
      'completed_payments', (SELECT COUNT(*) FROM completed_payments),
      'completed_payments_without_journal', (SELECT issue_count FROM issue_rows WHERE code = 'completed_payment_without_journal'),
      'unbalanced_journal_entries', (SELECT issue_count FROM issue_rows WHERE code = 'unbalanced_journal_entries'),
      'invoice_paid_amount_mismatches', (SELECT issue_count FROM issue_rows WHERE code = 'invoice_paid_amount_mismatch'),
      'overpaid_invoices', (SELECT issue_count FROM issue_rows WHERE code = 'overpaid_invoices')
    ),
    'issues', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'code', code,
          'count', issue_count,
          'sample', sample
        )
      ) FILTER (WHERE issue_count > 0),
      '[]'::jsonb
    ),
    'status', CASE WHEN COALESCE(SUM(issue_count), 0) = 0 THEN 'healthy' ELSE 'needs_attention' END
  )
  INTO v_result
  FROM issue_rows;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_integrity_report(uuid) TO authenticated;
