DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_unique;
DROP TRIGGER IF EXISTS trg_enforce_vehicle_plate_uniqueness ON public.vehicles;
DROP FUNCTION IF EXISTS public.enforce_vehicle_plate_uniqueness();
DROP INDEX IF EXISTS public.idx_vehicles_company_plate_normalized_lookup;
