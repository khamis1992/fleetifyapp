-- ================================================================
-- SYNC ALL AL-ARRAF VEHICLES FROM AGREEMENTS DATA
-- ================================================================
-- Processes ALL 450 contracts from agreements_with_details.sql
-- Company: العراف لتأجير السيارات
-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
-- ================================================================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_total_processed INTEGER := 0;
  v_vehicles_created INTEGER := 0;
  v_contracts_linked INTEGER := 0;
  v_contracts_updated INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚗 SYNCING ALL AL-ARRAF VEHICLES (450 contracts)...';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Process all contracts with vehicle data from agreements
  WITH agreements_data AS (
    SELECT 
      c.id as contract_id,
      c.contract_number,
      COALESCE(c.license_plate, '') as plate,
      COALESCE(c.make, '') as make,
      COALESCE(c.model, '') as model,
      COALESCE(c.year, 2023) as year,
      CASE 
        WHEN c.status = 'active' THEN 'rented'
        WHEN c.status = 'cancelled' OR c.status = 'closed' THEN 'available'
        ELSE 'available'
      END as vehicle_status
    FROM contracts c
    WHERE c.company_id = v_company_id
      AND c.license_plate IS NOT NULL
      AND c.license_plate != ''
  ),
  vehicle_operations AS (
    SELECT 
      ad.*,
      v.id as existing_vehicle_id
    FROM agreements_data ad
    LEFT JOIN vehicles v ON v.company_id = v_company_id 
      AND v.plate_number = ad.plate
  )
  -- Insert missing vehicles
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
  SELECT 
    gen_random_uuid(),
    v_company_id,
    vo.plate,
    vo.make,
    vo.model,
    vo.year,
    vo.vehicle_status,
    NOW(),
    NOW()
  FROM vehicle_operations vo
  WHERE vo.existing_vehicle_id IS NULL
    AND vo.plate IS NOT NULL
    AND vo.plate != ''
  ON CONFLICT (company_id, plate_number) DO NOTHING;
  
  GET DIAGNOSTICS v_vehicles_created = ROW_COUNT;
  
  RAISE NOTICE '✅ Vehicles Created: %', v_vehicles_created;
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Now linking contracts to vehicles...';
  RAISE NOTICE '';
  
  -- Link contracts to vehicles
  WITH vehicle_mapping AS (
    SELECT 
      c.id as contract_id,
      v.id as vehicle_id,
      c.license_plate,
      c.make,
      c.model
    FROM contracts c
    JOIN vehicles v ON v.company_id = c.company_id 
      AND v.plate_number = c.license_plate
    WHERE c.company_id = v_company_id
      AND c.vehicle_id IS NULL
      AND c.license_plate IS NOT NULL
  )
  UPDATE contracts c
  SET 
    vehicle_id = vm.vehicle_id,
    updated_at = NOW()
  FROM vehicle_mapping vm
  WHERE c.id = vm.contract_id;
  
  GET DIAGNOSTICS v_contracts_linked = ROW_COUNT;
  
  RAISE NOTICE '✅ Contracts Linked: %', v_contracts_linked;
  RAISE NOTICE '';
  
  -- Count total processed
  v_total_processed := v_vehicles_created + v_contracts_linked;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ SYNC COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Total Operations: %', v_total_processed;
  RAISE NOTICE '   - New Vehicles: %', v_vehicles_created;
  RAISE NOTICE '   - Contracts Linked: %', v_contracts_linked;
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- Final Verification
-- ================================================================
DO $$
DECLARE
  v_total INTEGER;
  v_with_vehicle_id INTEGER;
  v_without_vehicle_id INTEGER;
  v_with_plate_data INTEGER;
  v_can_be_linked INTEGER;
  v_percentage DECIMAL;
BEGIN
  -- Get statistics
  SELECT COUNT(*) INTO v_total
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';
  
  SELECT COUNT(*) INTO v_with_vehicle_id
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_without_vehicle_id
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NULL;
  
  SELECT COUNT(*) INTO v_with_plate_data
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NULL
    AND license_plate IS NOT NULL;
  
  -- Count contracts that can still be linked
  SELECT COUNT(DISTINCT c.id) INTO v_can_be_linked
  FROM contracts c
  JOIN vehicles v ON v.company_id = c.company_id 
    AND v.plate_number = c.license_plate
  WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL;
  
  v_percentage := ROUND((v_with_vehicle_id::DECIMAL / v_total * 100), 1);
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 FINAL STATISTICS - AL-ARRAF CONTRACTS';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Contracts: %', v_total;
  RAISE NOTICE '';
  RAISE NOTICE '✅ With vehicle_id: %', v_with_vehicle_id;
  RAISE NOTICE '   Percentage: %.1f%%', v_percentage;
  RAISE NOTICE '';
  RAISE NOTICE '❌ Without vehicle_id: %', v_without_vehicle_id;
  RAISE NOTICE '   - Have plate data: %', v_with_plate_data;
  RAISE NOTICE '   - Can be linked: %', v_can_be_linked;
  RAISE NOTICE '';
  
  IF v_percentage >= 90 THEN
    RAISE NOTICE '🎉 SUCCESS! %.1f%% of contracts have vehicles!', v_percentage;
  ELSIF v_percentage >= 70 THEN
    RAISE NOTICE '👍 GOOD! %.1f%% of contracts have vehicles', v_percentage;
    IF v_can_be_linked > 0 THEN
      RAISE NOTICE '💡 TIP: % more contracts can be linked', v_can_be_linked;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ %.1f%% linked - more work needed', v_percentage;
    IF v_can_be_linked > 0 THEN
      RAISE NOTICE '💡 ACTION: % contracts can be linked now', v_can_be_linked;
      RAISE NOTICE '   Run: supabase/migrations/20251029160000_link_alaraf_contracts_to_vehicles.sql';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

