-- Restores the previously deployed trigger body, including its known
-- inclusive-month defect. Rollback changes code only, not business records.
BEGIN;
CREATE OR REPLACE FUNCTION public.sync_contract_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_start_month date;
  v_end_month date;
  v_billing_months integer;
BEGIN
  IF COALESCE(current_setting('fleetify.atomic_contract_creation', true), '') = 'on'
     AND COALESCE(NEW.contract_amount, 0) > 0
  THEN
    NEW.balance_due := NEW.contract_amount - COALESCE(NEW.total_paid, 0);
    RETURN NEW;
  END IF;
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.monthly_amount > 0 THEN
    v_start_month := date_trunc('month', NEW.start_date)::date;
    v_end_month := date_trunc('month', NEW.end_date)::date;
    v_billing_months := GREATEST(1, (
      (EXTRACT(YEAR FROM v_end_month) - EXTRACT(YEAR FROM v_start_month)) * 12
      + EXTRACT(MONTH FROM v_end_month) - EXTRACT(MONTH FROM v_start_month) + 1
    )::integer);
    NEW.contract_amount := round(NEW.monthly_amount::numeric * v_billing_months, 3);
    NEW.balance_due := NEW.contract_amount - COALESCE(NEW.total_paid, 0);
  END IF;
  RETURN NEW;
END;
$function$;
COMMENT ON FUNCTION public.sync_contract_amount() IS
  'Legacy inclusive-month sync; preserves explicit amounts only inside audited atomic billing commands.';
COMMIT;
