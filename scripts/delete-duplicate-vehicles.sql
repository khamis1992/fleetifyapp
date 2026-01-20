-- ========================================
-- DELETE DUPLICATE VEHICLES SCRIPT
-- ========================================
-- This script will:
-- 1. Show you how many duplicates exist
-- 2. Delete duplicates (keeping only the oldest one for each plate)
-- 3. Add a unique constraint to prevent future duplicates
--
-- Run this in Supabase Dashboard: https://supabase.com/dashboard
-- SQL Editor -> Select your project -> Paste and execute
-- ========================================

-- STEP 1: Check how many duplicates exist
WITH ranked_vehicles AS (
  SELECT
    id,
    company_id,
    plate_number,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, LOWER(TRIM(plate_number))
      ORDER BY created_at ASC
    ) as rn,
    COUNT(*) OVER (
      PARTITION BY company_id, LOWER(TRIM(plate_number))
    ) as duplicate_count
  FROM vehicles
  WHERE plate_number IS NOT NULL
)
SELECT
  COUNT(*) as total_vehicles,
  SUM(CASE WHEN rn > 1 THEN 1 ELSE 0 END) as duplicates_to_delete,
  SUM(CASE WHEN duplicate_count > 1 THEN 1 ELSE 0 END) as plates_with_duplicates
FROM ranked_vehicles;

-- Expected output will show:
-- - total_vehicles: All vehicles in the system
-- - duplicates_to_delete: How many will be deleted
-- - plates_with_duplicates: How many plate numbers have duplicates

-- STEP 2: See which plates are duplicated (optional - for review)
SELECT
  plate_number,
  company_id,
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM vehicles
WHERE plate_number IS NOT NULL
GROUP BY company_id, plate_number
HAVING COUNT(*) > 1
ORDER BY count DESC, plate_number;

-- STEP 3: Delete duplicates (keeps oldest, deletes newer ones)
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
DELETE FROM vehicles
WHERE id IN (
  SELECT id FROM ranked_vehicles WHERE rn > 1
);

-- This will show how many rows were deleted

-- STEP 4: Verify duplicates are gone
WITH ranked_vehicles AS (
  SELECT
    company_id,
    plate_number,
    COUNT(*) as count,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, LOWER(TRIM(plate_number))
      ORDER BY created_at ASC
    ) as rn
  FROM vehicles
  WHERE plate_number IS NOT NULL
  GROUP BY company_id, plate_number
  HAVING COUNT(*) > 1
)
SELECT COUNT(*) as remaining_duplicates
FROM ranked_vehicles;

-- Should return 0 if all duplicates were removed

-- STEP 5: Add unique constraint to prevent future duplicates
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

-- STEP 6: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate
ON vehicles (company_id, LOWER(TRIM(plate_number)));

-- ========================================
-- DONE!
-- ========================================
-- Your database now:
-- ✅ Has no duplicate vehicles
-- ✅ Has a unique constraint to prevent future duplicates
-- ✅ Is optimized with an index
-- ========================================
