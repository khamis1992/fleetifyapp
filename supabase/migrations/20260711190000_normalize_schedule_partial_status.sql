-- Keep payment schedule status canonical while accepting the worker's legacy alias.

CREATE OR REPLACE FUNCTION public.normalize_contract_payment_schedule_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.status, '')) = 'partial' THEN
    NEW.status := 'partially_paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_contract_payment_schedule_status_trigger
  ON public.contract_payment_schedules;
CREATE TRIGGER normalize_contract_payment_schedule_status_trigger
BEFORE INSERT OR UPDATE OF status ON public.contract_payment_schedules
FOR EACH ROW
EXECUTE FUNCTION public.normalize_contract_payment_schedule_status();

