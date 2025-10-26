-- تحديث عقود العراف من "قيد المراجعة" إلى "نشطة"
-- Update Al-Arraf contracts from "under_review" to "active"
-- Total contracts: 101
-- Batch size: 50 contracts per run
-- Run this script 3 times (50 + 50 + 1 = 101)

-- ========================================
-- التحقق من العدد أولاً
-- Check count first
-- ========================================
SELECT 
    COUNT(*) as total_under_review,
    '👉 يجب تنفيذ التحديث ' || CEIL(COUNT(*)::numeric / 50) || ' مرة' as instruction
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- التحديث - نفذ هذا 3 مرات
-- Update - Run this 3 times
-- ========================================
UPDATE contracts
SET 
    status = 'active',
    updated_at = NOW()
WHERE id IN (
    SELECT id 
    FROM contracts 
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'under_review'
    LIMIT 50
);

-- ========================================
-- التحقق من المتبقي
-- Check remaining
-- ========================================
SELECT 
    COUNT(*) as remaining_under_review,
    '✅ تم التحديث: ' || (101 - COUNT(*)) as updated_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '🎉 اكتمل التحديث!'
        ELSE '👉 نفذ السكريبت مرة أخرى'
    END as status
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- عرض الإحصائيات النهائية
-- Display final statistics
-- ========================================
SELECT 
    status,
    COUNT(*) as count
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY count DESC;
