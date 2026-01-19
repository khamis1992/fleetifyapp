-- تحديث شامل: تغيير عقود العراف من "قيد المراجعة" إلى "نشطة"
-- Complete Update: Change Al-Arraf contracts from "under_review" to "active"
-- Total: 101 contracts in 3 batches (50 + 50 + 1)

-- ========================================
-- الدفعة 1: أول 50 عقد
-- Batch 1: First 50 contracts
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

-- التحقق بعد الدفعة 1
SELECT 
    'الدفعة 1 مكتملة. المتبقي: ' || COUNT(*) || ' عقد' as progress
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- الدفعة 2: التالي 50 عقد
-- Batch 2: Next 50 contracts
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

-- التحقق بعد الدفعة 2
SELECT 
    'الدفعة 2 مكتملة. المتبقي: ' || COUNT(*) || ' عقد' as progress
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- الدفعة 3: الباقي (1 عقد)
-- Batch 3: Remaining (1 contract)
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
-- التحقق النهائي
-- Final Verification
-- ========================================
SELECT 
    '✅ اكتمل التحديث!' as status,
    COUNT(*) as remaining_under_review,
    (SELECT COUNT(*) FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND status = 'active') as total_active,
    (SELECT COUNT(*) FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND updated_at >= NOW() - INTERVAL '5 minutes') as recently_updated
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- إحصائيات كاملة
-- Full Statistics
-- ========================================
SELECT 
    status as 'الحالة',
    COUNT(*) as 'العدد',
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'), 2) || '%' as 'النسبة'
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY COUNT(*) DESC;
