-- Restore the previous legacy direct-payment-only calculation.
-- Derived invoice values repaired by the forward migration are intentionally
-- not made inaccurate again during rollback.
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_paid decimal(12,2);
BEGIN
  IF NEW.payment_status != 'completed' OR NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND payment_status = 'completed';

  UPDATE public.invoices
  SET
    paid_amount = v_total_paid,
    balance_due = total_amount - v_total_paid,
    payment_status = CASE
      WHEN total_amount - v_total_paid <= 0 THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    updated_at = now()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_invoice_on_payment()
TO PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.update_invoice_on_payment() IS
  'Legacy direct-payment-only invoice total updater.';
