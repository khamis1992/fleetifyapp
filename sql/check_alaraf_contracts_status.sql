-- ================================================================
-- فحص عقود شركة العراف: عدد العقود وحالاتهم
-- Check Al-Arraf Contracts: Count and Status Distribution
-- ================================================================
-- Company: العراف لتأجير السيارات (Al-Arraf Car Rental)
-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
-- ================================================================

-- ================================================================
-- الخطوة 1: إجمالي عدد العقود
-- Step 1: Total Contract Count
-- ================================================================
SELECT 
    'إجمالي العقود' as "المعلومات",
    COUNT(*) as "العدد"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- ================================================================
-- الخطوة 2: توزيع الحالات مع النسب المئوية
-- Step 2: Status Distribution with Percentages
-- ================================================================
SELECT 
    CASE 
        WHEN status = 'active' THEN 'نشط'
        WHEN status = 'draft' THEN 'مسودة'
        WHEN status = 'under_review' THEN 'قيد المراجعة'
        WHEN status = 'cancelled' THEN 'ملغي'
        WHEN status = 'expired' THEN 'منتهي'
        WHEN status = 'expiring_soon' THEN 'قارب الانتهاء'
        WHEN status = 'suspended' THEN 'معلق'
        WHEN status = 'renewed' THEN 'مجدد'
        WHEN status = 'completed' THEN 'مكتمل'
        ELSE status
    END as "الحالة",
    status as "Status Code",
    COUNT(*) as "العدد",
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2)::TEXT || '%' as "النسبة المئوية"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY COUNT(*) DESC;

-- ================================================================
-- الخطوة 3: تفاصيل العقود حسب الحالة
-- Step 3: Contract Details by Status
-- ================================================================
SELECT 
    contract_number as "رقم العقد",
    CASE 
        WHEN status = 'active' THEN 'نشط'
        WHEN status = 'draft' THEN 'مسودة'
        WHEN status = 'under_review' THEN 'قيد المراجعة'
        WHEN status = 'cancelled' THEN 'ملغي'
        WHEN status = 'expired' THEN 'منتهي'
        WHEN status = 'expiring_soon' THEN 'قارب الانتهاء'
        WHEN status = 'suspended' THEN 'معلق'
        WHEN status = 'renewed' THEN 'مجدد'
        WHEN status = 'completed' THEN 'مكتمل'
        ELSE status
    END as "الحالة",
    TO_CHAR(contract_date, 'YYYY-MM-DD') as "تاريخ العقد",
    TO_CHAR(start_date, 'YYYY-MM-DD') as "تاريخ البداية",
    TO_CHAR(end_date, 'YYYY-MM-DD') as "تاريخ الانتهاء",
    contract_amount as "قيمة العقد",
    monthly_amount as "القيمة الشهرية",
    TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as "آخر تحديث"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
ORDER BY 
    CASE status
        WHEN 'active' THEN 1
        WHEN 'under_review' THEN 2
        WHEN 'draft' THEN 3
        WHEN 'expiring_soon' THEN 4
        WHEN 'expired' THEN 5
        WHEN 'cancelled' THEN 6
        ELSE 7
    END,
    contract_date DESC
LIMIT 50;

-- ================================================================
-- الخطوة 4: ملخص سريع
-- Step 4: Quick Summary
-- ================================================================
DO $$
DECLARE
    v_total INTEGER;
    v_active INTEGER;
    v_draft INTEGER;
    v_under_review INTEGER;
    v_cancelled INTEGER;
    v_expired INTEGER;
    v_other INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';
    
    -- Get active count
    SELECT COUNT(*) INTO v_active
    FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'active';
    
    -- Get draft count
    SELECT COUNT(*) INTO v_draft
    FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'draft';
    
    -- Get under_review count
    SELECT COUNT(*) INTO v_under_review
    FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'under_review';
    
    -- Get cancelled count
    SELECT COUNT(*) INTO v_cancelled
    FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'cancelled';
    
    -- Get expired count
    SELECT COUNT(*) INTO v_expired
    FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'expired';
    
    -- Get other statuses count
    SELECT COUNT(*) INTO v_other
    FROM contracts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status NOT IN ('active', 'draft', 'under_review', 'cancelled', 'expired');
    
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          📊 إحصائيات عقود شركة العراف                    ║';
    RAISE NOTICE '║     Al-Arraf Company Contracts Statistics                ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 إجمالي العقود: %', v_total;
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ نشط (Active):              % عقد (%%)', v_active, ROUND(v_active * 100.0 / NULLIF(v_total, 0), 2);
    RAISE NOTICE '📝 مسودة (Draft):              % عقد (%%)', v_draft, ROUND(v_draft * 100.0 / NULLIF(v_total, 0), 2);
    RAISE NOTICE '⏳ قيد المراجعة (Under Review): % عقد (%%)', v_under_review, ROUND(v_under_review * 100.0 / NULLIF(v_total, 0), 2);
    RAISE NOTICE '❌ ملغي (Cancelled):           % عقد (%%)', v_cancelled, ROUND(v_cancelled * 100.0 / NULLIF(v_total, 0), 2);
    RAISE NOTICE '🔴 منتهي (Expired):            % عقد (%%)', v_expired, ROUND(v_expired * 100.0 / NULLIF(v_total, 0), 2);
    RAISE NOTICE '📄 حالات أخرى (Other):         % عقد (%%)', v_other, ROUND(v_other * 100.0 / NULLIF(v_total, 0), 2);
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    
    IF v_active = v_total THEN
        RAISE NOTICE '⚠️  تحذير: جميع العقود بحالة نشط!';
        RAISE NOTICE '💡 قد يكون السبب:';
        RAISE NOTICE '   1. تم تنفيذ سكريبتات تحديث العقود إلى نشط';
        RAISE NOTICE '   2. العقود المنتهية لم يتم تحديثها تلقائياً';
        RAISE NOTICE '   3. العقود الملغاة لم يتم تحديثها';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ================================================================
-- الخطوة 5: التحقق من العقود المنتهية التي لا تزال نشطة
-- Step 5: Check Expired Contracts Still Marked as Active
-- ================================================================
SELECT 
    COUNT(*) as "عقود منتهية لكنها نشطة"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'active'
  AND end_date < CURRENT_DATE;

-- ================================================================
-- الخطوة 6: عرض العقود المنتهية التي لا تزال نشطة
-- Step 6: Show Expired Contracts Still Marked as Active
-- ================================================================
SELECT 
    contract_number as "رقم العقد",
    TO_CHAR(end_date, 'YYYY-MM-DD') as "تاريخ الانتهاء",
    CURRENT_DATE - end_date as "عدد الأيام منذ الانتهاء",
    monthly_amount as "القيمة الشهرية"
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'active'
  AND end_date < CURRENT_DATE
ORDER BY end_date DESC
LIMIT 20;

-- ================================================================
-- ✅ تم الانتهاء من الفحص
-- ================================================================

