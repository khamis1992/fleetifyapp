-- تحديث عقود العراف من "مسودة" إلى "نشطة"
-- Update Al-Arraf contracts from "draft" to "active"
-- Company: Al-Arraf Car Rental
-- Batch size: 50 contracts per run

-- ========================================
-- التحقق من العدد أولاً
-- Check count first
-- ========================================
SELECT 
    COUNT(*) as total_drafts,
    '👉 يجب تنفيذ التحديث ' || CEIL(COUNT(*)::numeric / 50) || ' مرة' as instruction
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'draft';

-- ========================================
-- التحديث - نفذ هذا حسب الحاجة
-- Update - Run this as needed
-- ========================================
UPDATE contracts
SET 
    status = 'active',
    updated_at = NOW()
WHERE id IN (
    SELECT id 
    FROM contracts 
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'draft'
    LIMIT 50
);

-- ========================================
-- التحقق من المتبقي
-- Check remaining
-- ========================================
SELECT 
    COUNT(*) as remaining_drafts,
    '✅ تم التحديث: ' || (
        SELECT COUNT(*) 
        FROM contracts 
        WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' 
        AND status = 'active'
        AND updated_at >= NOW() - INTERVAL '5 minutes'
    ) as recently_updated,
    CASE 
        WHEN COUNT(*) = 0 THEN '🎉 اكتمل التحديث!'
        ELSE '👉 نفذ السكريبت مرة أخرى'
    END as status
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'draft';

-- ========================================
-- عرض الإحصائيات النهائية
-- Display final statistics
-- ========================================
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) || '%' as percentage
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY count DESC;
