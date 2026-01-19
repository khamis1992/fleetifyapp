-- Batch Update: Update contracts in smaller batches to avoid timeout
-- تحديث تدريجي: تحديث العقود على دفعات صغيرة لتجنب timeout

-- ========================================
-- Batch 1: First 100 contracts
-- ========================================
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

-- Check progress after batch 1
SELECT 
    'Batch 1 complete. Remaining: ' || COUNT(*) || ' contracts' as progress
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- Batch 2: Next 100 contracts
-- ========================================
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

-- Check progress after batch 2
SELECT 
    'Batch 2 complete. Remaining: ' || COUNT(*) || ' contracts' as progress
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- Batch 3: Next 100 contracts
-- ========================================
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

-- Check progress after batch 3
SELECT 
    'Batch 3 complete. Remaining: ' || COUNT(*) || ' contracts' as progress
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- Batch 4: Next 100 contracts
-- ========================================
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

-- Check progress after batch 4
SELECT 
    'Batch 4 complete. Remaining: ' || COUNT(*) || ' contracts' as progress
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- ========================================
-- Batch 5: Remaining contracts (up to 100)
-- ========================================
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

-- Final verification
SELECT 
    '✅ All batches complete!' as status,
    COUNT(*) as remaining_under_review,
    (SELECT COUNT(*) FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND status = 'cancelled') as total_cancelled
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';
