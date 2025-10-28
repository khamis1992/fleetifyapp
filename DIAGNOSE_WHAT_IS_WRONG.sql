-- ================================================================
-- DIAGNOSTIC: What's wrong with CNT-25-0479?
-- ================================================================
-- شغّل هذا وأرسل لي النتائج كاملة
-- ================================================================

-- Q1: هل العقد موجود؟
SELECT 
  '❓ Q1: Does contract CNT-25-0479 exist?' as question,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO'
  END as answer
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number = 'CNT-25-0479';

-- Q2: إذا موجود، ما هي بياناته؟
SELECT 
  '❓ Q2: Contract data (if exists)' as question,
  contract_number,
  license_plate,
  make,
  model,
  year,
  vehicle_id,
  id as contract_uuid,
  status
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number = 'CNT-25-0479';

-- Q3: هل الأعمدة موجودة في الجدول؟
SELECT 
  '❓ Q3: Do columns exist in table?' as question,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contracts'
  AND column_name IN ('license_plate', 'make', 'model', 'year', 'vehicle_id')
ORDER BY column_name;

-- Q4: هل المركبة موجودة؟
SELECT 
  '❓ Q4: Does vehicle with plate 7036 exist?' as question,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO'
  END as answer
FROM vehicles
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND plate_number = '7036';

-- Q5: إذا المركبة موجودة، ما بياناتها؟
SELECT 
  '❓ Q5: Vehicle data (if exists)' as question,
  id as vehicle_uuid,
  plate_number,
  make,
  model,
  year,
  status
FROM vehicles
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND plate_number = '7036';

-- Q6: كم عقد في العراف عنده مركبات؟
SELECT 
  '❓ Q6: How many contracts have vehicles?' as question,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL) as with_vehicle,
  COUNT(*) FILTER (WHERE vehicle_id IS NULL) as without_vehicle,
  ROUND(COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) as percentage_with_vehicle
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Q7: ما هي آخر العقود المحدّثة؟
SELECT 
  '❓ Q7: Recently updated contracts' as question,
  contract_number,
  license_plate,
  make,
  model,
  vehicle_id,
  updated_at
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
ORDER BY updated_at DESC
LIMIT 10;

-- ================================================================
-- SUMMARY
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 PLEASE SEND ME THE RESULTS ABOVE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'I need to see:';
  RAISE NOTICE '1. Q1: Does the contract exist?';
  RAISE NOTICE '2. Q2: What data does it have?';
  RAISE NOTICE '3. Q3: Do the columns exist?';
  RAISE NOTICE '4. Q4-Q5: Does the vehicle exist?';
  RAISE NOTICE '';
  RAISE NOTICE 'With these results, I can identify the exact problem!';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

