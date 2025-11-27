-- ================================================================
-- تفعيل عقود العراف: قيد المراجعة → نشطة
-- Activate Al-Arraf Contracts: under_review → active
-- ================================================================
-- Company: العراف لتأجير السيارات (Al-Arraf Car Rental)
-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
-- Expected Count: 101 contracts
-- ================================================================

-- ================================================================
-- الخطوة 1: التحقق من عدد العقود
-- Step 1: Check contract count
-- ================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'under_review';
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 عدد العقود قيد المراجعة: %', v_count;
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- الخطوة 2: تحديث العقود (الدفعة 1 - 50 عقد)
-- Step 2: Update contracts (Batch 1 - 50 contracts)
-- ================================================================
UPDATE contracts
SET 
  status = 'active',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM contracts 
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'under_review'
  LIMIT 50
);

-- ================================================================
-- الخطوة 3: تحديث العقود (الدفعة 2 - 50 عقد)
-- Step 3: Update contracts (Batch 2 - 50 contracts)
-- ================================================================
UPDATE contracts
SET 
  status = 'active',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM contracts 
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'under_review'
  LIMIT 50
);

-- ================================================================
-- الخطوة 4: تحديث العقود (الدفعة 3 - المتبقي)
-- Step 4: Update contracts (Batch 3 - Remaining)
-- ================================================================
UPDATE contracts
SET 
  status = 'active',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM contracts 
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'under_review'
  LIMIT 50
);

-- ================================================================
-- الخطوة 5: التحقق من النتائج
-- Step 5: Verify results
-- ================================================================
DO $$
DECLARE
  v_remaining INTEGER;
  v_active_count INTEGER;
  v_updated_recently INTEGER;
BEGIN
  -- عد المتبقي في حالة "قيد المراجعة"
  SELECT COUNT(*) INTO v_remaining
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'under_review';
  
  -- عد العقود النشطة الإجمالي
  SELECT COUNT(*) INTO v_active_count
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'active';
  
  -- عد العقود التي تم تحديثها في آخر 5 دقائق
  SELECT COUNT(*) INTO v_updated_recently
  FROM contracts
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'active'
    AND updated_at >= NOW() - INTERVAL '5 minutes';
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ اكتمل التحديث بنجاح!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 الإحصائيات النهائية:';
  RAISE NOTICE '   - المتبقي في "قيد المراجعة": %', v_remaining;
  RAISE NOTICE '   - إجمالي العقود النشطة: %', v_active_count;
  RAISE NOTICE '   - تم تفعيله للتو: %', v_updated_recently;
  RAISE NOTICE '';
  
  IF v_remaining = 0 THEN
    RAISE NOTICE '🎉 تم تفعيل جميع العقود بنجاح!';
  ELSE
    RAISE NOTICE '⚠️ يوجد % عقد متبقي في حالة "قيد المراجعة"', v_remaining;
  END IF;
  
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- الخطوة 6: عرض توزيع حالات العقود
-- Step 6: Display contract status distribution
-- ================================================================
SELECT 
  status as "الحالة",
  COUNT(*) as "العدد",
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2)::TEXT || '%' as "النسبة"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY COUNT(*) DESC;

-- ================================================================
-- الخطوة 7: عرض آخر 20 عقد تم تفعيله
-- Step 7: Display last 20 activated contracts
-- ================================================================
SELECT 
  contract_number as "رقم العقد",
  status as "الحالة",
  TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as "وقت التحديث"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'active'
  AND updated_at >= NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC
LIMIT 20;

-- ================================================================
-- ✅ تم! العقود جاهزة للاستخدام
-- ================================================================

