-- ================================================================
-- EMERGENCY FIX: Contract CNT-25-0479
-- ================================================================
-- حل طارئ ومباشر - لا يعتمد على UUID
-- ================================================================

-- الخطوة 1: تحقق من العقد
SELECT 
  '📋 Finding CNT-25-0479' as step,
  id,
  contract_number,
  license_plate,
  make,
  model,
  year,
  vehicle_id,
  status
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number = 'CNT-25-0479';

-- الخطوة 2: حدّث بيانات المركبة مباشرة
UPDATE contracts
SET 
  license_plate = '7036',
  make = 'Bestune',
  model = 'T77 pro',
  year = 2023,
  updated_at = NOW()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number = 'CNT-25-0479';

-- الخطوة 3: تحقق من التحديث
SELECT 
  '✅ After Data Update' as step,
  id,
  contract_number,
  license_plate,
  make,
  model,
  year,
  vehicle_id
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number = 'CNT-25-0479';

-- الخطوة 4: ابحث عن المركبة
SELECT 
  '🚗 Searching for vehicle' as step,
  id,
  plate_number,
  make,
  model,
  year,
  status
FROM vehicles
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND plate_number = '7036';

-- الخطوة 5: أنشئ المركبة إذا لم تكن موجودة
INSERT INTO vehicles (
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
  '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID,
  '7036',
  'Bestune',
  'T77 pro',
  2023,
  'rented'::vehicle_status,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM vehicles 
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND plate_number = '7036'
)
ON CONFLICT (company_id, plate_number) DO NOTHING
RETURNING id, plate_number, make, model;

-- الخطوة 6: اربط العقد بالمركبة
UPDATE contracts c
SET 
  vehicle_id = v.id,
  updated_at = NOW()
FROM vehicles v
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number = 'CNT-25-0479'
  AND v.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND v.plate_number = '7036';

-- ================================================================
-- النتيجة النهائية
-- ================================================================
SELECT 
  '🎉 FINAL RESULT' as result,
  c.contract_number,
  c.license_plate,
  c.make,
  c.model,
  c.year,
  c.vehicle_id,
  v.plate_number as vehicle_plate,
  CASE 
    WHEN c.vehicle_id IS NOT NULL THEN '✅ SUCCESS! Contract has vehicle!'
    WHEN c.license_plate IS NOT NULL THEN '⚠️ Has data but not linked'
    ELSE '❌ Still no data'
  END as status
FROM contracts c
LEFT JOIN vehicles v ON v.id = c.vehicle_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number = 'CNT-25-0479';

-- ================================================================
-- ملخص
-- ================================================================
DO $$
DECLARE
  v_has_vehicle BOOLEAN;
  v_contract_exists BOOLEAN;
BEGIN
  -- Check if contract exists
  SELECT EXISTS(
    SELECT 1 FROM contracts 
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND contract_number = 'CNT-25-0479'
  ) INTO v_contract_exists;
  
  IF NOT v_contract_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '❌ CONTRACT CNT-25-0479 DOES NOT EXIST!';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Possible reasons:';
    RAISE NOTICE '1. Wrong contract number';
    RAISE NOTICE '2. Contract in different company';
    RAISE NOTICE '3. Contract deleted';
    RAISE NOTICE '';
    RAISE NOTICE 'Check available contracts with:';
    RAISE NOTICE 'SELECT contract_number FROM contracts';
    RAISE NOTICE 'WHERE company_id = ''24bc0b21-4e2d-4413-9842-31719a3669f4''';
    RAISE NOTICE 'ORDER BY contract_number LIMIT 20;';
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
    RETURN;
  END IF;
  
  -- Check if has vehicle
  SELECT (vehicle_id IS NOT NULL) INTO v_has_vehicle
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND contract_number = 'CNT-25-0479';
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  IF v_has_vehicle THEN
    RAISE NOTICE '🎉🎉🎉 SUCCESS! CNT-25-0479 NOW HAS A VEHICLE! 🎉🎉🎉';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Contract number: CNT-25-0479';
    RAISE NOTICE '✅ Vehicle: 7036 - Bestune T77 pro (2023)';
    RAISE NOTICE '✅ Status: Linked and ready!';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 You can now see this contract with vehicle in the app!';
  ELSE
    RAISE NOTICE '⚠️ CNT-25-0479 EXISTS BUT STILL NO VEHICLE';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Troubleshooting steps:';
    RAISE NOTICE '1. Check if vehicle was created (search for plate 7036)';
    RAISE NOTICE '2. Check if contract has license_plate data';
    RAISE NOTICE '3. Run FIND_REAL_CONTRACT.sql for detailed diagnosis';
    RAISE NOTICE '';
    RAISE NOTICE 'Quick check:';
    RAISE NOTICE 'SELECT license_plate, make, model, vehicle_id';
    RAISE NOTICE 'FROM contracts WHERE contract_number = ''CNT-25-0479'';';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

