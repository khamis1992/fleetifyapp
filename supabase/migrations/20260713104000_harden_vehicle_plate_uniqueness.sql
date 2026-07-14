-- Prevent new normalized plate duplicates without deleting historical vehicles.
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate_normalized_lookup
  ON public.vehicles (company_id, lower(btrim(plate_number)));

CREATE OR REPLACE FUNCTION public.enforce_vehicle_plate_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  normalized_plate text;
BEGIN
  normalized_plate := lower(btrim(NEW.plate_number));
  IF normalized_plate IS NULL OR normalized_plate = '' THEN
    RETURN NEW;
  END IF;

  -- Serialize writes for the same company/plate pair to close race conditions.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.company_id::text || ':' || normalized_plate, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.vehicles AS existing
    WHERE existing.company_id = NEW.company_id
      AND lower(btrim(existing.plate_number)) = normalized_plate
      AND existing.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'A vehicle with plate % already exists for this company', NEW.plate_number
      USING ERRCODE = '23505',
            CONSTRAINT = 'vehicles_company_plate_normalized_unique';
  END IF;

  NEW.plate_number := upper(regexp_replace(btrim(NEW.plate_number), '\s+', ' ', 'g'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vehicle_plate_uniqueness ON public.vehicles;
CREATE TRIGGER trg_enforce_vehicle_plate_uniqueness
BEFORE INSERT OR UPDATE OF company_id, plate_number ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_vehicle_plate_uniqueness();

-- Add a database-enforced unique index immediately when historical data is clean.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles
    WHERE plate_number IS NOT NULL AND btrim(plate_number) <> ''
    GROUP BY company_id, lower(btrim(plate_number))
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_company_plate_normalized_unique
      ON public.vehicles (company_id, lower(btrim(plate_number)))
      WHERE plate_number IS NOT NULL AND btrim(plate_number) <> '';
  ELSE
    RAISE NOTICE 'Historical duplicate vehicle plates remain; trigger protection is active for new writes.';
  END IF;
END;
$$;

