-- Add vehicle fields directly to contracts table
-- This migration adds vehicle-related fields to the contracts table
-- to support storing vehicle information directly on contracts

-- Add license_plate column if it doesn't exist
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS license_plate TEXT;

-- Add make column if it doesn't exist
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS make TEXT;

-- Add model column if it doesn't exist
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS model TEXT;

-- Add year column if it doesn't exist
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Add vehicle_status column if it doesn't exist
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS vehicle_status TEXT;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_contracts_license_plate ON public.contracts(license_plate);
CREATE INDEX IF NOT EXISTS idx_contracts_make_model ON public.contracts(make, model);

-- Add comments for documentation
COMMENT ON COLUMN public.contracts.license_plate IS 'Vehicle license plate number';
COMMENT ON COLUMN public.contracts.make IS 'Vehicle manufacturer/make';
COMMENT ON COLUMN public.contracts.model IS 'Vehicle model';
COMMENT ON COLUMN public.contracts.year IS 'Vehicle manufacture year';
COMMENT ON COLUMN public.contracts.vehicle_status IS 'Current status of the vehicle (available, rented, maintenance, etc.)';

-- Update existing contracts to populate vehicle fields from linked vehicles if available
UPDATE public.contracts c
SET
  license_plate = COALESCE(c.license_plate, v.plate_number),
  make = COALESCE(c.make, v.make),
  model = COALESCE(c.model, v.model),
  year = COALESCE(c.year, v.year),
  vehicle_status = COALESCE(c.vehicle_status, v.status::TEXT)
FROM public.vehicles v
WHERE c.vehicle_id = v.id
  AND c.vehicle_id IS NOT NULL
  AND (c.license_plate IS NULL OR c.make IS NULL OR c.model IS NULL);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';