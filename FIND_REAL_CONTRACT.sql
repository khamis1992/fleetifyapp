-- ================================================================
-- FIND THE REAL CONTRACT CNT-25-0479
-- ================================================================

-- البحث 1: بحث برقم العقد
SELECT 
  '🔍 Search by Contract Number' as search_type,
  id,
  contract_number,
  customer_id,
  vehicle_id,
  license_plate,
  make,
  model,
  year,
  status,
  created_at
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number = 'CNT-25-0479';

-- البحث 2: البحث عن العقد رقم 479 حسب ترتيب الإنشاء
WITH numbered_contracts AS (
  SELECT 
    c.*,
    ROW_NUMBER() OVER (ORDER BY c.created_at) as row_num
  FROM contracts c
  WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
)
SELECT 
  '📊 Contract #479 by Creation Order' as search_type,
  id,
  contract_number,
  license_plate,
  make,
  model,
  year,
  vehicle_id,
  status,
  row_num
FROM numbered_contracts
WHERE row_num = 479;

-- البحث 3: بحث بالـ UUID من الملف
SELECT 
  '🆔 Search by UUID from agreements file' as search_type,
  id,
  contract_number,
  customer_id,
  vehicle_id,
  license_plate,
  make,
  model,
  status
FROM contracts
WHERE id = '1da2810c-20d4-4cfc-8768-dfe553cb282d';

-- البحث 4: عرض العقود حول 479
SELECT 
  '📋 Contracts around #479' as search_type,
  contract_number,
  id,
  license_plate,
  make,
  model,
  vehicle_id,
  status
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number IN (
    'CNT-25-0477', 'CNT-25-0478', 'CNT-25-0479', 
    'CNT-25-0480', 'CNT-25-0481'
  )
ORDER BY contract_number;

-- البحث 5: إجمالي العقود في الشركة
SELECT 
  '📊 Total Contracts in Al-Arraf' as info,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL) as with_vehicle,
  COUNT(*) FILTER (WHERE vehicle_id IS NULL) as without_vehicle
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- البحث 6: أعلى رقم عقد
SELECT 
  '🔢 Latest Contract Numbers' as info,
  contract_number,
  id,
  created_at
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number LIKE 'CNT-25-%'
ORDER BY 
  CAST(SUBSTRING(contract_number FROM 8) AS INTEGER) DESC
LIMIT 10;

-- البحث 7: بحث في سجل أرقام العقود
SELECT 
  '📜 Contract Number History for CNT-25-0479' as search_type,
  contract_id,
  old_contract_number,
  new_contract_number,
  updated_at
FROM contract_number_history
WHERE new_contract_number = 'CNT-25-0479'
   OR old_contract_number LIKE '%479%'
LIMIT 10;

-- ================================================================
-- INSTRUCTIONS
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 SEARCH RESULTS ABOVE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Check the results:';
  RAISE NOTICE '';
  RAISE NOTICE '1. If "Search by Contract Number" shows results:';
  RAISE NOTICE '   → Use that UUID in the fix script';
  RAISE NOTICE '';
  RAISE NOTICE '2. If "Contract #479 by Creation Order" shows results:';
  RAISE NOTICE '   → That might be your contract (different number)';
  RAISE NOTICE '';
  RAISE NOTICE '3. If no results found:';
  RAISE NOTICE '   → The contract CNT-25-0479 does not exist';
  RAISE NOTICE '   → Check "Latest Contract Numbers" to see what exists';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

