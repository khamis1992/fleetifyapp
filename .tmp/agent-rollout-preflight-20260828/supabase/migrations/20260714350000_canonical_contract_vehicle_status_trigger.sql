-- Derive vehicle availability from current operational records after contract changes.

CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state jsonb;
  v_target text;
BEGIN
  -- AFTER triggers see the final contract state, so the old vehicle can be
  -- recalculated safely when a contract is moved, closed, or deleted.
  IF TG_OP <> 'INSERT' AND OLD.vehicle_id IS NOT NULL THEN
    v_state := public.system_agent_vehicle_derived_state(
      OLD.vehicle_id,
      OLD.company_id
    );
    v_target := v_state ->> 'target_status';

    IF v_target IS NOT NULL THEN
      UPDATE public.vehicles
      SET status = v_target::public.vehicle_status,
          updated_at = now()
      WHERE id = OLD.vehicle_id
        AND company_id = OLD.company_id
        AND status IS DISTINCT FROM v_target::public.vehicle_status;
    END IF;
  END IF;

  -- Recalculate the new/current vehicle as well. This uses contract dates,
  -- reservations, and maintenance instead of assuming every active row is due now.
  IF TG_OP <> 'DELETE'
     AND NEW.vehicle_id IS NOT NULL
     AND (
       TG_OP = 'INSERT'
       OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.start_date IS DISTINCT FROM OLD.start_date
       OR NEW.end_date IS DISTINCT FROM OLD.end_date
     )
  THEN
    v_state := public.system_agent_vehicle_derived_state(
      NEW.vehicle_id,
      NEW.company_id
    );
    v_target := v_state ->> 'target_status';

    IF v_target IS NOT NULL THEN
      UPDATE public.vehicles
      SET status = v_target::public.vehicle_status,
          updated_at = now()
      WHERE id = NEW.vehicle_id
        AND company_id = NEW.company_id
        AND status IS DISTINCT FROM v_target::public.vehicle_status;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_update_vehicle_status_after ON public.contracts;
DROP TRIGGER IF EXISTS trigger_update_vehicle_status ON public.contracts;
DROP TRIGGER IF EXISTS update_vehicle_on_contract_change ON public.contracts;
CREATE TRIGGER trg_update_vehicle_status_after
AFTER INSERT OR UPDATE OF vehicle_id, company_id, status, start_date, end_date OR DELETE
ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_vehicle_status_from_contract();
COMMENT ON FUNCTION public.update_vehicle_status_from_contract() IS
'Recalculates affected vehicle states from canonical contracts, reservations, maintenance, and dates after contract changes.';
