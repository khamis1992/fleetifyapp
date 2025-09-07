-- حذف العقود المكررة للحفاظ على العقود الأحدث فقط
-- حذف العقود التي تم إنشاؤها في نفس التوقيت (المكررة)

DELETE FROM contracts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND contract_number IN ('LTO2024245', 'AGR-202504-406726')
AND created_at < (
    SELECT MAX(created_at) 
    FROM contracts c2 
    WHERE c2.contract_number = contracts.contract_number 
    AND c2.company_id = contracts.company_id
);

-- تحديث إحصائيات العقود
UPDATE companies 
SET updated_at = now() 
WHERE id = '24bc0b21-4e2d-4413-9842-31719a3669f4';