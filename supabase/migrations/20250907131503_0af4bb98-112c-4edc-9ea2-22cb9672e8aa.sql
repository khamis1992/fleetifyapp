-- حذف العقود المكررة نهائياً
DELETE FROM contracts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND contract_number IN ('LTO2024245', 'AGR-202504-406726');

-- إعادة تعيين تسلسل أرقام العقود
UPDATE companies 
SET updated_at = now() 
WHERE id = '24bc0b21-4e2d-4413-9842-31719a3669f4';