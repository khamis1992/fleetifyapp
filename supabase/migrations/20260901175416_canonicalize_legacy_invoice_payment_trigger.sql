-- Keep the legacy final AFTER-payment trigger from overwriting allocation-ledger totals.
-- Trigger execution order places this function after the canonical allocation seed,
-- so it must finish by recalculating from payment_allocations rather than summing only
-- payments.invoice_id rows.
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.invoice_id IS NOT NULL THEN
    PERFORM public.recalculate_invoice_financial_state(NEW.invoice_id);
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.invoice_id IS NOT NULL
     AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id
  THEN
    PERFORM public.recalculate_invoice_financial_state(OLD.invoice_id);
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_invoice_on_payment()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_invoice_on_payment()
TO service_role;

COMMENT ON FUNCTION public.update_invoice_on_payment() IS
  'Final payment trigger guard: recalculates invoice state from the canonical allocation ledger so direct payment rows cannot overwrite earlier active allocations.';
