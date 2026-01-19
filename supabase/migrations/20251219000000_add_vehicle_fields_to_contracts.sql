-- Add vehicle fields directly to contracts table
-- This migration adds vehicle-related fields to the contracts table
-- to support storing vehicle information directly on contracts

-- Use DO block to safely add columns without affecting views
DO $$
BEGIN
  -- Add license_plate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contracts' 
    AND column_name = 'license_plate'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN license_plate TEXT;
  END IF;

  -- Add make column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contracts' 
    AND column_name = 'make'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN make TEXT;
  END IF;

  -- Add model column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contracts' 
    AND column_name = 'model'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN model TEXT;
  END IF;

  -- Add year column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contracts' 
    AND column_name = 'year'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN year INTEGER;
  END IF;

  -- Add vehicle_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contracts' 
    AND column_name = 'vehicle_status'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN vehicle_status TEXT;
  END IF;
END $$;

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