-- Keep a single source of contract amounts: the canonical missing-amount
-- calculator and audited financial commands. A later BEFORE trigger must not
-- overwrite an agreed amount after require_atomic_contract_billing_graph ran.
-- No historical contract, invoice, schedule or payment is rewritten here.
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_contract_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  -- trigger_calculate_contract_amount runs earlier and fills a missing amount.
  -- Explicit amounts (including partial-month schedules) are authoritative.
  -- An unchanged SET list must not turn a notes save into a financial write.
  IF TG_OP = 'INSERT' THEN
    NEW.balance_due := NEW.contract_amount - COALESCE(NEW.total_paid, 0);
  ELSIF NEW.contract_amount IS DISTINCT FROM OLD.contract_amount
     OR NEW.total_paid IS DISTINCT FROM OLD.total_paid
  THEN
    NEW.balance_due := NEW.contract_amount - COALESCE(NEW.total_paid, 0);
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.sync_contract_amount() IS
  'Preserves canonical or explicitly agreed contract amounts; only refreshes balance when monetary inputs change. Never infers an extra month during an ordinary update.';

COMMIT;
