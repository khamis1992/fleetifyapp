-- تحديث حالة جميع العقود من "قيد المراجعة" إلى "ملغية" في شركة العراف
-- Update all contracts from "under_review" to "cancelled" in Al-Arraf company
-- Expected count: 409 contracts

-- الخطوة 1: التحقق من معرف الشركة
-- Step 1: Verify company ID
DO $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_contracts_count INTEGER;
BEGIN
    -- الحصول على معرف شركة العراف
    SELECT id, name_ar INTO v_company_id, v_company_name
    FROM companies 
    WHERE name_ar LIKE '%العراف%' OR name LIKE '%العراف%'
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'شركة العراف غير موجودة';
    END IF;
    
    RAISE NOTICE 'معرف الشركة: %, الاسم: %', v_company_id, v_company_name;
    
    -- عد العقود التي ستتأثر
    SELECT COUNT(*) INTO v_contracts_count
    FROM contracts
    WHERE company_id = v_company_id
      AND status = 'under_review';
    
    RAISE NOTICE 'عدد العقود التي سيتم تحديثها: %', v_contracts_count;
    
    -- التحديث
    UPDATE contracts
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE company_id = v_company_id
      AND status = 'under_review';
    
    RAISE NOTICE 'تم التحديث بنجاح. العقود المحدثة: %', v_contracts_count;
    
END $$;

-- التحقق من النتائج
-- Verification query
SELECT 
    c.name_ar as company_name,
    COUNT(*) as cancelled_count
FROM contracts ct
JOIN companies c ON c.id = ct.company_id
WHERE c.name_ar LIKE '%العراف%'
  AND ct.status = 'cancelled'
GROUP BY c.id, c.name_ar;

-- عرض إحصائيات حالات العقود بعد التحديث
-- Display contract status statistics after update
SELECT 
    status,
    COUNT(*) as count
FROM contracts ct
JOIN companies c ON c.id = ct.company_id
WHERE c.name_ar LIKE '%العراف%'
GROUP BY status
ORDER BY count DESC;
