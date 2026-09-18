-- Keep cancelled duplicate schedules from being revived by later payment-state syncs.

CREATE OR REPLACE FUNCTION public.preserve_inactive_duplicate_schedule_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_old_inactive boolean := lower(COALESCE(OLD.status, '')) IN (
    'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
  );
  v_new_active boolean := lower(COALESCE(NEW.status, '')) NOT IN (
    'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
  );
BEGIN
  IF v_old_inactive
     AND v_new_active
     AND EXISTS (
       SELECT 1
       FROM public.contract_payment_schedules other_schedule
       WHERE other_schedule.id <> OLD.id
         AND other_schedule.company_id = OLD.company_id
         AND other_schedule.contract_id = OLD.contract_id
         AND other_schedule.due_date IS NOT DISTINCT FROM OLD.due_date
         AND lower(COALESCE(other_schedule.status, '')) NOT IN (
           'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
         )
     )
  THEN
    NEW.status := OLD.status;
    NEW.invoice_id := OLD.invoice_id;
    NEW.paid_amount := OLD.paid_amount;
    NEW.paid_date := OLD.paid_date;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS preserve_inactive_duplicate_schedule_state_trigger
  ON public.contract_payment_schedules;
CREATE TRIGGER preserve_inactive_duplicate_schedule_state_trigger
BEFORE UPDATE OF status, invoice_id, paid_amount, paid_date
ON public.contract_payment_schedules
FOR EACH ROW
EXECUTE FUNCTION public.preserve_inactive_duplicate_schedule_state();
COMMENT ON FUNCTION public.preserve_inactive_duplicate_schedule_state() IS
  'Prevents payment synchronization from reviving an inactive duplicate when the same contract date already has an active schedule.';
COMMENT ON TRIGGER preserve_inactive_duplicate_schedule_state_trigger
  ON public.contract_payment_schedules IS
  'Preserves inactive duplicate schedule state across later invoice and payment synchronization.';
