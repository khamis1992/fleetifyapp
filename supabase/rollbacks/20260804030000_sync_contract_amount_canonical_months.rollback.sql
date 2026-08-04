-- Rollback: restore the legacy AGE-based sync_contract_amount formula.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_contract_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.monthly_amount > 0 THEN
    NEW.contract_amount := (EXTRACT(YEAR FROM AGE(NEW.end_date, NEW.start_date)) * 12 + EXTRACT(MONTH FROM AGE(NEW.end_date, NEW.start_date)) + 1) * NEW.monthly_amount;
    NEW.balance_due := NEW.contract_amount - COALESCE(NEW.total_paid, 0);
  END IF;
  RETURN NEW;
END;
$function$;

COMMIT;
