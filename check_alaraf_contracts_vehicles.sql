-- ================================================================
-- CHECK AL-ARRAF CONTRACTS AND VEHICLES
-- ================================================================
-- Company: العراف لتأجير السيارات
-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
-- ================================================================

-- ================================================================
-- 1. Check total contracts
-- ================================================================
SELECT 
  '📊 Total Contracts' as metric,
  COUNT(*) as count
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- ================================================================
-- 2. Check contracts by status
-- ================================================================
SELECT 
  '📋 Contracts by Status' as title,
  status as "الحالة",
  COUNT(*) as "العدد",
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2)::TEXT || '%' as "النسبة"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY COUNT(*) DESC;

-- ================================================================
-- 3. Check contracts WITH vehicles
-- ================================================================
SELECT 
  '✅ Contracts WITH Vehicles' as metric,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'), 2)::TEXT || '%' as percentage
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND vehicle_id IS NOT NULL;

-- ================================================================
-- 4. Check contracts WITHOUT vehicles
-- ================================================================
SELECT 
  '❌ Contracts WITHOUT Vehicles' as metric,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'), 2)::TEXT || '%' as percentage
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND vehicle_id IS NULL;

-- ================================================================
-- 5. Check contracts WITHOUT vehicles by status
-- ================================================================
SELECT 
  '📊 Contracts WITHOUT Vehicles (by status)' as title,
  status as "الحالة",
  COUNT(*) as "عدد العقود بدون مركبات"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND vehicle_id IS NULL
GROUP BY status
ORDER BY COUNT(*) DESC;

-- ================================================================
-- 6. Sample contracts WITHOUT vehicles
-- ================================================================
SELECT 
  '📋 Sample: First 20 Contracts WITHOUT Vehicles' as title,
  contract_number as "رقم العقد",
  status as "الحالة",
  license_plate as "رقم اللوحة (من العقد)",
  make as "النوع",
  model as "الموديل",
  TO_CHAR(start_date, 'YYYY-MM-DD') as "تاريخ البداية"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND vehicle_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- ================================================================
-- 7. Check if vehicle data exists in contract fields
-- ================================================================
SELECT 
  '🚗 Contracts with Vehicle Data in Fields (but no vehicle_id)' as title,
  COUNT(*) as "العدد"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND vehicle_id IS NULL
  AND (
    license_plate IS NOT NULL 
    OR make IS NOT NULL 
    OR model IS NOT NULL
  );

-- ================================================================
-- 8. Sample contracts with plate but no vehicle_id
-- ================================================================
SELECT 
  '🔍 Contracts with Plate Number but NO vehicle_id' as title,
  contract_number as "رقم العقد",
  license_plate as "رقم اللوحة",
  make || ' ' || model as "المركبة",
  status as "الحالة"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND vehicle_id IS NULL
  AND license_plate IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- ================================================================
-- 9. Check if vehicles exist with those plate numbers
-- ================================================================
WITH contracts_without_vehicles AS (
  SELECT 
    c.id as contract_id,
    c.contract_number,
    c.license_plate,
    c.status
  FROM contracts c
  WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL
)
SELECT 
  '🔗 Vehicles that EXIST for Contracts without vehicle_id' as title,
  cwv.contract_number as "رقم العقد",
  cwv.license_plate as "رقم اللوحة في العقد",
  v.plate_number as "رقم اللوحة في المركبات",
  v.id as "معرف المركبة",
  cwv.status as "حالة العقد",
  v.status as "حالة المركبة"
FROM contracts_without_vehicles cwv
LEFT JOIN vehicles v ON v.plate_number = cwv.license_plate 
  AND v.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
WHERE v.id IS NOT NULL
LIMIT 20;

-- ================================================================
-- 10. Total vehicles available
-- ================================================================
SELECT 
  '🚗 Total Vehicles in System' as metric,
  COUNT(*) as count
FROM vehicles
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- ================================================================
-- 11. Vehicles by status
-- ================================================================
SELECT 
  '📊 Vehicles by Status' as title,
  status as "حالة المركبة",
  COUNT(*) as "العدد"
FROM vehicles
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY COUNT(*) DESC;

-- ================================================================
-- SUMMARY AND RECOMMENDATIONS
-- ================================================================
DO $$
DECLARE
  v_contracts_total INTEGER;
  v_contracts_with_vehicle INTEGER;
  v_contracts_without_vehicle INTEGER;
  v_contracts_with_plate_no_id INTEGER;
  v_vehicles_exist_for_contracts INTEGER;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO v_contracts_total
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';
  
  SELECT COUNT(*) INTO v_contracts_with_vehicle
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_contracts_without_vehicle
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NULL;
  
  SELECT COUNT(*) INTO v_contracts_with_plate_no_id
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND vehicle_id IS NULL
    AND license_plate IS NOT NULL;
  
  -- Count how many vehicles exist for contracts without vehicle_id
  SELECT COUNT(DISTINCT c.id) INTO v_vehicles_exist_for_contracts
  FROM contracts c
  JOIN vehicles v ON v.plate_number = c.license_plate 
    AND v.company_id = c.company_id
  WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 SUMMARY - AL-ARRAF CONTRACTS & VEHICLES';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Contracts:';
  RAISE NOTICE '   Total: %', v_contracts_total;
  RAISE NOTICE '   ✅ With vehicle_id: % (%.1f%%)', 
    v_contracts_with_vehicle,
    (v_contracts_with_vehicle::DECIMAL / v_contracts_total * 100);
  RAISE NOTICE '   ❌ Without vehicle_id: % (%.1f%%)', 
    v_contracts_without_vehicle,
    (v_contracts_without_vehicle::DECIMAL / v_contracts_total * 100);
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Contracts with Plate but NO vehicle_id: %', v_contracts_with_plate_no_id;
  RAISE NOTICE '🔗 Vehicles EXIST for those contracts: %', v_vehicles_exist_for_contracts;
  RAISE NOTICE '';
  
  IF v_vehicles_exist_for_contracts > 0 THEN
    RAISE NOTICE '💡 RECOMMENDATION:';
    RAISE NOTICE '   Run the linking script to connect % contracts to their vehicles!', 
      v_vehicles_exist_for_contracts;
    RAISE NOTICE '   File: link_alaraf_contracts_to_vehicles.sql';
  END IF;
  
  IF v_contracts_with_plate_no_id > v_vehicles_exist_for_contracts THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ WARNING:';
    RAISE NOTICE '   % contracts have plate numbers but vehicles do not exist!', 
      (v_contracts_with_plate_no_id - v_vehicles_exist_for_contracts);
    RAISE NOTICE '   These may need manual vehicle creation.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

