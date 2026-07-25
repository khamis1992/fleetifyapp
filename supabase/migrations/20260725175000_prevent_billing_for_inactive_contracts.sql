-- Prevent any billing artifacts from being created for contracts that are no
-- longer billable. This protects manual UI actions, RPCs, cron jobs, and repair
-- jobs that may otherwise bypass frontend checks.

CREATE OR REPLACE FUNCTION public.prevent_billing_for_inactive_contracts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract_status text;
  v_record_status text := lower(COALESCE(NEW.status, ''));
  v_payment_status text := '';
BEGIN
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT lower(COALESCE(contract.status, ''))
  INTO v_contract_status
  FROM public.contracts contract
  WHERE contract.id = NEW.contract_id;

  IF TG_TABLE_NAME = 'invoices' THEN
    v_payment_status := lower(COALESCE(NEW.payment_status, ''));
  END IF;

  IF v_contract_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_contract_status NOT IN ('active', 'under_legal_procedure')
     AND v_record_status NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive')
     AND v_payment_status NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive')
  THEN
    RAISE EXCEPTION 'Cannot create billing records for inactive contract status: %', v_contract_status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_inactive_contract_invoice_billing
  ON public.invoices;
CREATE TRIGGER prevent_inactive_contract_invoice_billing
  BEFORE INSERT OR UPDATE OF contract_id, status, payment_status
  ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_billing_for_inactive_contracts();

DROP TRIGGER IF EXISTS prevent_inactive_contract_schedule_billing
  ON public.contract_payment_schedules;
CREATE TRIGGER prevent_inactive_contract_schedule_billing
  BEFORE INSERT OR UPDATE OF contract_id, status
  ON public.contract_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_billing_for_inactive_contracts();

COMMENT ON FUNCTION public.prevent_billing_for_inactive_contracts() IS
  'Blocks active invoices and payment schedules for contracts that are not active or under legal procedure.';
