-- ================================================================
-- DETAILED CHECK: Contract CNT-25-0479 Status
-- ================================================================
-- UUID: 1da2810c-20d4-4cfc-8768-dfe553cb282d
-- ================================================================

-- Step 1: Check if columns exist in table
SELECT 
  '🔍 Checking if columns exist in contracts table' as step,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
  AND table_schema = 'public'
  AND column_name IN ('license_plate', 'make', 'model', 'year', 'vehicle_id')
ORDER BY ordinal_position;

-- Step 2: Check current state of the contract
SELECT 
  '📋 Current State of CNT-25-0479' as step,
  id,
  contract_number,
  license_plate,
  make,
  model,
  year,
  vehicle_id,
  status,
  CASE 
    WHEN license_plate IS NULL THEN '❌ license_plate is NULL'
    WHEN TRIM(license_plate) = '' THEN '❌ license_plate is EMPTY'
    ELSE '✅ license_plate: ' || license_plate
  END as plate_status,
  CASE 
    WHEN make IS NULL THEN '❌ make is NULL'
    WHEN TRIM(make) = '' THEN '❌ make is EMPTY'
    ELSE '✅ make: ' || make
  END as make_status,
  CASE 
    WHEN model IS NULL THEN '❌ model is NULL'
    WHEN TRIM(model) = '' THEN '❌ model is EMPTY'
    ELSE '✅ model: ' || model
  END as model_status,
  CASE 
    WHEN vehicle_id IS NULL THEN '❌ NOT LINKED to vehicle'
    ELSE '✅ LINKED to vehicle: ' || vehicle_id::TEXT
  END as link_status
FROM contracts
WHERE id = '1da2810c-20d4-4cfc-8768-dfe553cb282d'
  AND company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Step 3: Search for matching vehicle
SELECT 
  '🚗 Searching for vehicle with plate 7036' as step,
  id,
  plate_number,
  make,
  model,
  year,
  status,
  CASE 
    WHEN plate_number = '7036' THEN '✅ EXACT MATCH'
    WHEN TRIM(plate_number) = '7036' THEN '⚠️ TRIMMED MATCH'
    WHEN plate_number LIKE '%7036%' THEN '⚠️ PARTIAL MATCH'
    ELSE '❌ NO MATCH'
  END as match_type
FROM vehicles
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND (
    plate_number = '7036'
    OR TRIM(plate_number) = '7036'
    OR plate_number LIKE '%7036%'
  );

-- Step 4: Check all vehicles with similar make/model
SELECT 
  '🔍 All Bestune T77 pro vehicles' as step,
  id,
  plate_number,
  make,
  model,
  year,
  status
FROM vehicles
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND make ILIKE '%bestune%'
  AND model ILIKE '%T77%'
ORDER BY plate_number;

-- Step 5: Show all contract data (raw)
SELECT 
  '📊 Raw Contract Data' as step,
  *
FROM contracts
WHERE id = '1da2810c-20d4-4cfc-8768-dfe553cb282d'
  AND company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- ================================================================
-- SUMMARY
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 DIAGNOSIS FOR CONTRACT CNT-25-0479';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'UUID: 1da2810c-20d4-4cfc-8768-dfe553cb282d';
  RAISE NOTICE 'Expected: plate=7036, make=Bestune, model=T77 pro, year=2023';
  RAISE NOTICE '';
  RAISE NOTICE 'Check the results above to see:';
  RAISE NOTICE '1. Do columns exist in table?';
  RAISE NOTICE '2. What is the current state of the contract?';
  RAISE NOTICE '3. Does a matching vehicle exist?';
  RAISE NOTICE '4. What vehicles are available?';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

