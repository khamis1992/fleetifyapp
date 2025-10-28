-- ================================================================
-- COMPLETE AL-ARRAF VEHICLE SYNC SOLUTION
-- ================================================================
-- This is a COMPLETE solution to sync ALL vehicles for Al-Arraf
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

-- ================================================================
-- STEP 1: Check Current State (DETAILED DIAGNOSTICS)
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_total INTEGER;
  v_with_vehicle INTEGER;
  v_without_vehicle INTEGER;
  v_has_plate_data INTEGER;
  v_total_vehicles INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM contracts WHERE company_id = v_company_id;
  
  SELECT COUNT(*) INTO v_with_vehicle
  FROM contracts WHERE company_id = v_company_id AND vehicle_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_without_vehicle
  FROM contracts WHERE company_id = v_company_id AND vehicle_id IS NULL;
  
  SELECT COUNT(*) INTO v_has_plate_data
  FROM contracts 
  WHERE company_id = v_company_id 
    AND vehicle_id IS NULL
    AND license_plate IS NOT NULL
    AND TRIM(license_plate) != '';
  
  SELECT COUNT(*) INTO v_total_vehicles
  FROM vehicles WHERE company_id = v_company_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 CURRENT STATE - AL-ARRAF';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Total Contracts: %', v_total;
  RAISE NOTICE '✅ With Vehicles: % (%.1f%%)', 
    v_with_vehicle, 
    (v_with_vehicle::DECIMAL / v_total * 100);
  RAISE NOTICE '❌ Without Vehicles: % (%.1f%%)', 
    v_without_vehicle,
    (v_without_vehicle::DECIMAL / v_total * 100);
  RAISE NOTICE '💡 Has Plate Data (can be linked): %', v_has_plate_data;
  RAISE NOTICE '';
  RAISE NOTICE '🚗 Total Vehicles in System: %', v_total_vehicles;
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STEP 2: Create Missing Vehicles from Contract Data
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_created INTEGER := 0;
BEGIN
  RAISE NOTICE '🚗 Creating missing vehicles from contract data...';
  RAISE NOTICE '';
  
  -- Create vehicles for contracts that have plate/make/model but no vehicle exists
  INSERT INTO vehicles (
    id,
    company_id,
    plate_number,
    make,
    model,
    year,
    status,
    created_at,
    updated_at
  )
  SELECT DISTINCT ON (TRIM(c.license_plate))
    gen_random_uuid(),
    v_company_id,
    TRIM(c.license_plate),
    COALESCE(TRIM(c.make), 'غير محدد'),
    COALESCE(TRIM(c.model), 'غير محدد'),
    COALESCE(c.year, 2023),
    (CASE 
      WHEN c.status = 'active' THEN 'rented'
      ELSE 'available'
    END)::vehicle_status,
    NOW(),
    NOW()
  FROM contracts c
  WHERE c.company_id = v_company_id
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND NOT EXISTS (
      SELECT 1 FROM vehicles v 
      WHERE v.company_id = v_company_id 
        AND TRIM(v.plate_number) = TRIM(c.license_plate)
    )
  ON CONFLICT (company_id, plate_number) DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  
  RAISE NOTICE '✅ Created % new vehicles', v_created;
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STEP 3: Link Contracts to Vehicles (SMART MATCHING)
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_linked INTEGER := 0;
  v_linked_exact INTEGER := 0;
  v_linked_trimmed INTEGER := 0;
BEGIN
  RAISE NOTICE '🔗 Linking contracts to vehicles (SMART MATCHING)...';
  RAISE NOTICE '';
  
  -- Method 1: Exact Match
  RAISE NOTICE '1️⃣ Trying EXACT match...';
  UPDATE contracts c
  SET 
    vehicle_id = v.id,
    updated_at = NOW()
  FROM vehicles v
  WHERE c.company_id = v_company_id
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL
    AND c.license_plate != ''
    AND v.company_id = v_company_id
    AND v.plate_number = c.license_plate;
  
  GET DIAGNOSTICS v_linked_exact = ROW_COUNT;
  RAISE NOTICE '   ✅ Exact matches: %', v_linked_exact;
  
  -- Method 2: Trimmed Match (removes spaces)
  RAISE NOTICE '2️⃣ Trying TRIMMED match (ignoring spaces)...';
  UPDATE contracts c
  SET 
    vehicle_id = v.id,
    updated_at = NOW()
  FROM vehicles v
  WHERE c.company_id = v_company_id
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND v.company_id = v_company_id
    AND TRIM(v.plate_number) = TRIM(c.license_plate);
  
  GET DIAGNOSTICS v_linked_trimmed = ROW_COUNT;
  RAISE NOTICE '   ✅ Trimmed matches: %', v_linked_trimmed;
  
  v_linked := v_linked_exact + v_linked_trimmed;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total linked: % contracts', v_linked;
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STEP 4: Update Vehicle Status Based on Active Contracts
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_updated INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Updating vehicle statuses...';
  RAISE NOTICE '';
  
  -- Update vehicles to 'rented' if they have active contracts
  UPDATE vehicles v
  SET 
    status = 'rented'::vehicle_status,
    updated_at = NOW()
  FROM contracts c
  WHERE v.company_id = v_company_id
    AND c.company_id = v_company_id
    AND c.vehicle_id = v.id
    AND c.status = 'active'
    AND v.status != 'rented'::vehicle_status;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RAISE NOTICE '✅ Updated % vehicles to "rented" status', v_updated;
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STEP 5: Final Verification
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_total INTEGER;
  v_with_vehicle INTEGER;
  v_without_vehicle INTEGER;
  v_percentage DECIMAL;
  v_total_vehicles INTEGER;
BEGIN
  -- Contracts stats
  SELECT COUNT(*) INTO v_total
  FROM contracts WHERE company_id = v_company_id;
  
  SELECT COUNT(*) INTO v_with_vehicle
  FROM contracts WHERE company_id = v_company_id AND vehicle_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_without_vehicle
  FROM contracts WHERE company_id = v_company_id AND vehicle_id IS NULL;
  
  v_percentage := ROUND((v_with_vehicle::DECIMAL / v_total * 100), 1);
  
  -- Vehicles count
  SELECT COUNT(*) INTO v_total_vehicles
  FROM vehicles WHERE company_id = v_company_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🎯 FINAL RESULTS - AL-ARRAF';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Contracts:';
  RAISE NOTICE '   Total: %', v_total;
  RAISE NOTICE '   ✅ With Vehicles: % (%.1f%%)', v_with_vehicle, v_percentage;
  RAISE NOTICE '   ❌ Without Vehicles: %', v_without_vehicle;
  RAISE NOTICE '';
  RAISE NOTICE '🚗 Vehicles:';
  RAISE NOTICE '   Total in System: %', v_total_vehicles;
  RAISE NOTICE '';
  
  IF v_percentage >= 95 THEN
    RAISE NOTICE '🎉 EXCELLENT! %.1f%% of contracts have vehicles!', v_percentage;
  ELSIF v_percentage >= 80 THEN
    RAISE NOTICE '👍 GOOD! %.1f%% of contracts have vehicles!', v_percentage;
  ELSIF v_percentage >= 50 THEN
    RAISE NOTICE '⚠️ MODERATE: %.1f%% of contracts have vehicles', v_percentage;
  ELSE
    RAISE NOTICE '❌ LOW: Only %.1f%% of contracts have vehicles', v_percentage;
  END IF;
  
  RAISE NOTICE '';
  
  IF v_without_vehicle > 0 THEN
    RAISE NOTICE '💡 Next Steps for Remaining % Contracts:', v_without_vehicle;
    RAISE NOTICE '   1. Check if they have license_plate data';
    RAISE NOTICE '   2. Manually add vehicle data if missing';
    RAISE NOTICE '   3. Re-run this script';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- BONUS: Show Contracts Still Without Vehicles
-- ================================================================
SELECT 
  'Contracts Still Without Vehicles' as section,
  contract_number,
  license_plate,
  make,
  model,
  status,
  CASE 
    WHEN license_plate IS NULL THEN '❌ No plate data'
    WHEN make IS NULL OR model IS NULL THEN '⚠️ Incomplete vehicle data'
    ELSE '✅ Has data - needs manual review'
  END as issue
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND vehicle_id IS NULL
ORDER BY 
  CASE 
    WHEN license_plate IS NOT NULL AND make IS NOT NULL THEN 1
    WHEN license_plate IS NOT NULL THEN 2
    ELSE 3
  END,
  created_at DESC
LIMIT 20;

