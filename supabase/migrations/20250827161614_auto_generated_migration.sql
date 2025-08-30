-- تحديث رقم رخصة القيادة ليكون نفس رقم البطاقة المدنية للعميل
UPDATE customers 
SET license_number = national_id,
    updated_at = now()
WHERE id = '90253c27-960a-4de4-bb30-a19c7abd6210' 
AND license_number IS NULL 
AND national_id IS NOT NULL;