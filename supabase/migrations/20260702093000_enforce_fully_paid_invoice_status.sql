-- Enforce invoice payment-state consistency.
--
-- Fixes historical invoices where paid_amount/balance_due show fully paid
-- while status/payment_status still say draft/unpaid. Then prevents the same
-- inconsistent state from being written again.

CREATE OR REPLACE FUNCTION public.normalize_invoice_payment_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total numeric := COALESCE(NEW.total_amount, 0);
  v_paid numeric := COALESCE(NEW.paid_amount, 0);
  v_balance numeric := GREATEST(v_total - v_paid, 0);
  v_status text := LOWER(COALESCE(NEW.status, ''));
  v_payment_status text := LOWER(COALESCE(NEW.payment_status, ''));
BEGIN
  IF v_status = 'cancelled' OR v_payment_status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  NEW.balance_due := v_balance;

  IF v_total <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_paid <= 0 THEN
    NEW.payment_status := 'unpaid';
    IF LOWER(COALESCE(NEW.status, '')) = 'paid' THEN
      NEW.status := CASE
        WHEN NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'sent'
      END;
    END IF;
  ELSIF v_total - v_paid <= 0.01 THEN
    NEW.payment_status := 'paid';
    NEW.status := 'paid';
    NEW.balance_due := 0;
  ELSE
    NEW.payment_status := 'partial';
    IF LOWER(COALESCE(NEW.status, '')) = 'paid' THEN
      NEW.status := CASE
        WHEN NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'sent'
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_invoice_payment_state_trigger ON public.invoices;
CREATE TRIGGER normalize_invoice_payment_state_trigger
  BEFORE INSERT OR UPDATE OF total_amount, paid_amount, balance_due, payment_status, status
  ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_invoice_payment_state();

WITH completed_payment_totals AS (
  SELECT
    invoice_id,
    SUM(amount) AS completed_paid
  FROM public.payments
  WHERE invoice_id IS NOT NULL
    AND LOWER(COALESCE(payment_status::text, '')) = 'completed'
  GROUP BY invoice_id
)
UPDATE public.invoices i
SET
  paid_amount = GREATEST(COALESCE(i.paid_amount, 0), COALESCE(cpt.completed_paid, 0)),
  balance_due = 0,
  payment_status = 'paid',
  status = 'paid',
  updated_at = now()
FROM completed_payment_totals cpt
WHERE i.id = cpt.invoice_id
  AND COALESCE(i.total_amount, 0) > 0
  AND COALESCE(cpt.completed_paid, COALESCE(i.paid_amount, 0)) >= COALESCE(i.total_amount, 0) - 0.01
  AND LOWER(COALESCE(i.status::text, '')) <> 'cancelled'
  AND LOWER(COALESCE(i.payment_status::text, '')) <> 'cancelled'
  AND (
    LOWER(COALESCE(i.status::text, '')) <> 'paid'
    OR LOWER(COALESCE(i.payment_status::text, '')) <> 'paid'
    OR COALESCE(i.balance_due, 0) > 0.01
  );

UPDATE public.invoices i
SET
  balance_due = 0,
  payment_status = 'paid',
  status = 'paid',
  updated_at = now()
WHERE COALESCE(i.total_amount, 0) > 0
  AND COALESCE(i.paid_amount, 0) >= COALESCE(i.total_amount, 0) - 0.01
  AND LOWER(COALESCE(i.status::text, '')) <> 'cancelled'
  AND LOWER(COALESCE(i.payment_status::text, '')) <> 'cancelled'
  AND (
    LOWER(COALESCE(i.status::text, '')) <> 'paid'
    OR LOWER(COALESCE(i.payment_status::text, '')) <> 'paid'
    OR COALESCE(i.balance_due, 0) > 0.01
  );

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_fully_paid_state_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_fully_paid_state_check
  CHECK (
    LOWER(COALESCE(status::text, '')) = 'cancelled'
    OR LOWER(COALESCE(payment_status::text, '')) = 'cancelled'
    OR COALESCE(total_amount, 0) <= 0
    OR COALESCE(paid_amount, 0) < COALESCE(total_amount, 0) - 0.01
    OR COALESCE(balance_due, 0) > 0.01
    OR (
      LOWER(COALESCE(status::text, '')) = 'paid'
      AND LOWER(COALESCE(payment_status::text, '')) = 'paid'
    )
  ) NOT VALID;

COMMENT ON FUNCTION public.normalize_invoice_payment_state() IS
'Normalizes invoice status/payment_status from paid_amount and total_amount before invoice writes.';

COMMENT ON CONSTRAINT invoices_fully_paid_state_check ON public.invoices IS
'Prevents fully paid non-cancelled invoices from being saved with unpaid/draft statuses.';
