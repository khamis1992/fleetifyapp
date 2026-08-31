-- Rollback: Normalize vehicle plates and merge duplicates

-- Drop updated indexes
DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_unique;
DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_lookup;

-- Restore previous trigger (collapses multiple spaces to single space)
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

-- Restore previous indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate_normalized_lookup
  ON public.vehicles (company_id, lower(btrim(plate_number)));

-- Note: The duplicate merge data changes (FK repoints, deactivations) are NOT rolled back
-- as they represent correct data consolidation. To undo:
-- 1. Reactivate retired vehicles: UPDATE vehicles SET is_active=true, plate_number=SUBSTRING(plate_number FROM 5) WHERE plate_number LIKE 'DUP-%'
-- 2. Manually revert FK changes if needed
