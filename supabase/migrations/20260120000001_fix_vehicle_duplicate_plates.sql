-- Fix: Add unique constraint on (company_id, plate_number) to prevent duplicate vehicles
-- This migration will:
-- 1. Remove duplicate vehicles (keeping only the oldest one for each plate)
-- 2. Add a unique constraint to prevent future duplicates

-- Step 1: Identify duplicates
WITH ranked_vehicles AS (
  SELECT
    id,
    company_id,
    plate_number,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, LOWER(TRIM(plate_number))
      ORDER BY created_at ASC
    ) as rn
  FROM vehicles
  WHERE plate_number IS NOT NULL
)
-- Step 2: Delete duplicates (keep only the oldest)
DELETE FROM vehicles
WHERE id IN (
  SELECT id FROM ranked_vehicles WHERE rn > 1
);

-- Step 3: Add unique constraint
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicles_company_plate_unique'
  ) THEN
    ALTER TABLE vehicles
    ADD CONSTRAINT vehicles_company_plate_unique
    UNIQUE (company_id, LOWER(TRIM(plate_number)));
  END IF;
END $$;

-- Step 4: Create index for faster lookups (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate
ON vehicles (company_id, LOWER(TRIM(plate_number)));

-- This ensures:
-- - No two vehicles can have the same plate number within the same company
-- - Plate numbers are compared case-insensitively and ignoring leading/trailing spaces
-- - The constraint is enforced at the database level (not just application level)
