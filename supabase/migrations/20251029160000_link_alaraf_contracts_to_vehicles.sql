-- ================================================================
-- LINK AL-ARRAF CONTRACTS TO VEHICLES
-- ================================================================
-- Links contracts to vehicles using plate numbers
-- Company: العراف لتأجير السيارات
-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
-- ================================================================

-- ================================================================
-- STEP 1: Link contracts to vehicles using license_plate
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract RECORD;
  v_vehicle_id UUID;
  v_linked_count INTEGER := 0;
  v_not_found_count INTEGER := 0;
  v_already_linked_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔗 LINKING AL-ARRAF CONTRACTS TO VEHICLES...';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Loop through contracts without vehicle_id
  FOR v_contract IN
    SELECT 
      id,
      contract_number,
      license_plate,
      make,
      model,
      status
    FROM contracts
    WHERE company_id = v_company_id
      AND vehicle_id IS NULL
      AND license_plate IS NOT NULL
    ORDER BY created_at
  LOOP
    -- Try to find vehicle by plate number
    SELECT id INTO v_vehicle_id
    FROM vehicles
    WHERE company_id = v_company_id
      AND plate_number = v_contract.license_plate
    LIMIT 1;
    
    IF v_vehicle_id IS NOT NULL THEN
      -- Update contract with vehicle_id
      UPDATE contracts
      SET 
        vehicle_id = v_vehicle_id,
        updated_at = NOW()
      WHERE id = v_contract.id;
      
      v_linked_count := v_linked_count + 1;
      
      -- Log every 50 links
      IF v_linked_count % 50 = 0 THEN
        RAISE NOTICE '   ✅ Linked % contracts so far...', v_linked_count;
      END IF;
    ELSE
      v_not_found_count := v_not_found_count + 1;
      
      -- Log first 5 not found
      IF v_not_found_count <= 5 THEN
        RAISE NOTICE '   ⚠️ Vehicle not found for contract % (plate: %)', 
          v_contract.contract_number, v_contract.license_plate;
      END IF;
    END IF;
  END LOOP;
  
  -- Count already linked contracts
  SELECT COUNT(*) INTO v_already_linked_count
  FROM contracts
  WHERE company_id = v_company_id
    AND vehicle_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ LINKING COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Newly Linked: %', v_linked_count;
  RAISE NOTICE 'Already Linked: %', v_already_linked_count;
  RAISE NOTICE 'Total Linked Now: %', v_linked_count + v_already_linked_count;
  RAISE NOTICE 'Vehicle Not Found: %', v_not_found_count;
  RAISE NOTICE '';
  
  IF v_not_found_count > 0 THEN
    RAISE NOTICE '⚠️ Note: % contracts have plate numbers but vehicles do not exist', v_not_found_count;
    RAISE NOTICE '   These may need manual vehicle creation or the plate number is incorrect';
  END IF;
  
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STEP 2: Create vehicles for contracts that have vehicle data but no vehicle exists
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract RECORD;
  v_vehicle_id UUID;
  v_created_count INTEGER := 0;
  v_vehicle_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚗 CREATING MISSING VEHICLES FROM CONTRACT DATA...';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Loop through contracts with vehicle data but no vehicle_id
  FOR v_contract IN
    SELECT 
      id,
      contract_number,
      license_plate,
      make,
      model,
      year,
      status
    FROM contracts
    WHERE company_id = v_company_id
      AND vehicle_id IS NULL
      AND license_plate IS NOT NULL
      AND make IS NOT NULL
      AND model IS NOT NULL
    ORDER BY created_at
  LOOP
    -- Check if vehicle already exists
    SELECT EXISTS(
      SELECT 1 FROM vehicles 
      WHERE company_id = v_company_id 
        AND plate_number = v_contract.license_plate
    ) INTO v_vehicle_exists;
    
    IF NOT v_vehicle_exists THEN
      -- Create vehicle from contract data
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
      ) VALUES (
        gen_random_uuid(),
        v_company_id,
        v_contract.license_plate,
        v_contract.make,
        v_contract.model,
        v_contract.year,
        CASE 
          WHEN v_contract.status = 'active' THEN 'rented'
          ELSE 'available'
        END,
        NOW(),
        NOW()
      ) RETURNING id INTO v_vehicle_id;
      
      -- Link contract to new vehicle
      UPDATE contracts
      SET 
        vehicle_id = v_vehicle_id,
        updated_at = NOW()
      WHERE id = v_contract.id;
      
      v_created_count := v_created_count + 1;
      
      -- Log every 20 creations
      IF v_created_count % 20 = 0 THEN
        RAISE NOTICE '   ✅ Created % vehicles so far...', v_created_count;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ VEHICLE CREATION COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Vehicles Created: %', v_created_count;
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STEP 3: Final verification
-- ================================================================
DO $$
DECLARE
  v_total INTEGER;
  v_with_vehicle INTEGER;
  v_without_vehicle INTEGER;
  v_percentage DECIMAL;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';
  
  SELECT COUNT(*) INTO v_with_vehicle
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_without_vehicle
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NULL;
  
  v_percentage := ROUND((v_with_vehicle::DECIMAL / v_total * 100), 1);
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 FINAL RESULTS - AL-ARRAF CONTRACTS';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Contracts: %', v_total;
  RAISE NOTICE '✅ With Vehicles: % (%.1f%%)', v_with_vehicle, v_percentage;
  RAISE NOTICE '❌ Without Vehicles: % (%.1f%%)', v_without_vehicle, (100 - v_percentage);
  RAISE NOTICE '';
  
  IF v_percentage >= 90 THEN
    RAISE NOTICE '🎉 EXCELLENT! %.1f%% of contracts are linked to vehicles!', v_percentage;
  ELSIF v_percentage >= 70 THEN
    RAISE NOTICE '👍 GOOD! %.1f%% of contracts are linked to vehicles!', v_percentage;
  ELSE
    RAISE NOTICE '⚠️ WARNING! Only %.1f%% of contracts are linked to vehicles!', v_percentage;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

