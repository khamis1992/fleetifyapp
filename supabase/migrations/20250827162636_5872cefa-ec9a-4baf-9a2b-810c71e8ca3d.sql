-- إضافة تاريخ انتهاء البطاقة المدنية للعميل الحالي
UPDATE customers 
SET national_id_expiry = '2027-12-31',
    updated_at = now()
WHERE id = '90253c27-960a-4de4-bb30-a19c7abd6210' 
AND national_id_expiry IS NULL;