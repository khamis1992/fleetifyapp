-- Simple Batch Update - Run this 5 times to update all 409 contracts
-- تحديث بسيط - نفذ هذا 5 مرات لتحديث جميع الـ 409 عقد

-- Each run updates 100 contracts
UPDATE contracts
SET 
    status = 'cancelled',
    updated_at = NOW()
WHERE id IN (
    SELECT id 
    FROM contracts 
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'under_review'
    LIMIT 100
);

-- Check how many are left
SELECT 
    COUNT(*) as contracts_remaining,
    '👉 Run this query ' || CEIL(COUNT(*)::numeric / 100) || ' more time(s)' as instruction
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';
