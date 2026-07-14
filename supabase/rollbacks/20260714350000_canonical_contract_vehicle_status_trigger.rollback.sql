-- Restore the pre-canonical contract trigger behavior.

CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vehicle_id IS NOT NULL THEN
      UPDATE public.vehicles
      SET status = CASE
        WHEN NEW.status = 'active' THEN 'rented'::public.vehicle_status
        WHEN NEW.status = 'draft' THEN 'street_52'::public.vehicle_status
        ELSE status
      END
      WHERE id = NEW.vehicle_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
      IF OLD.vehicle_id IS NOT NULL THEN
        UPDATE public.vehicles
        SET status = 'available'::public.vehicle_status
        WHERE id = OLD.vehicle_id;
      END IF;

      IF NEW.vehicle_id IS NOT NULL THEN
        UPDATE public.vehicles
        SET status = CASE
          WHEN NEW.status = 'active' THEN 'rented'::public.vehicle_status
          WHEN NEW.status IN ('draft', 'under_review', 'suspended') THEN 'street_52'::public.vehicle_status
          WHEN NEW.status = 'under_legal_procedure' THEN 'rented'::public.vehicle_status
          ELSE status
        END
        WHERE id = NEW.vehicle_id;
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.vehicle_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'cancelled' THEN
        UPDATE public.vehicles SET status = 'available'::public.vehicle_status WHERE id = NEW.vehicle_id;
      ELSIF NEW.status = 'active' THEN
        UPDATE public.vehicles SET status = 'rented'::public.vehicle_status WHERE id = NEW.vehicle_id;
      ELSIF NEW.status IN ('under_review', 'suspended') THEN
        UPDATE public.vehicles SET status = 'street_52'::public.vehicle_status WHERE id = NEW.vehicle_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.vehicle_id IS NOT NULL THEN
      UPDATE public.vehicles
      SET status = 'available'::public.vehicle_status
      WHERE id = OLD.vehicle_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_vehicle_status_after ON public.contracts;

CREATE TRIGGER trg_update_vehicle_status_after
AFTER INSERT OR UPDATE OR DELETE
ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_vehicle_status_from_contract();

