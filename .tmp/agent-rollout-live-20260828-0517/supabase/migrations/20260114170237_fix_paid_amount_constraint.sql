-- تعديل قيد paid_amount للسماح بالمبالغ الزائدة
ALTER TABLE contract_payment_schedules DROP CONSTRAINT IF EXISTS valid_paid_amount;

ALTER TABLE contract_payment_schedules 
ADD CONSTRAINT valid_paid_amount 
CHECK (paid_amount >= 0);;
