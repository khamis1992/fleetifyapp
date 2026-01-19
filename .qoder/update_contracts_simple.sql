-- تحديث بسيط: تحويل العقود من under_review إلى cancelled في شركة العراف
-- Simple Update: Convert contracts from under_review to cancelled in Al-Arraf company

-- معرف شركة العراف (استبدل هذا بالمعرف الصحيح)
-- Al-Arraf company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4

UPDATE contracts
SET 
    status = 'cancelled',
    updated_at = NOW()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- عرض النتائج
SELECT 
    'تم تحديث ' || COUNT(*) || ' عقد بنجاح' as result
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'cancelled'
  AND updated_at >= NOW() - INTERVAL '1 minute';
