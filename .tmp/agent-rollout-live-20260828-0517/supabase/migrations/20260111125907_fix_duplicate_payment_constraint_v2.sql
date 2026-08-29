
-- إصلاح قيد منع الدفعات المكررة لدعم الدفعات المجمعة

-- حذف القيد القديم (constraint وليس index فقط)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS prevent_duplicate_contract_payments;

-- حذف الـ index إذا كان موجوداً بشكل منفصل
DROP INDEX IF EXISTS prevent_duplicate_contract_payments;

-- إنشاء قيد جديد يتضمن invoice_id (للدفعات المرتبطة بفواتير)
CREATE UNIQUE INDEX prevent_duplicate_invoice_payments 
ON public.payments (company_id, customer_id, contract_id, invoice_id, payment_date, amount)
WHERE invoice_id IS NOT NULL;

-- قيد منفصل للدفعات بدون فاتورة محددة
CREATE UNIQUE INDEX prevent_duplicate_general_payments 
ON public.payments (company_id, customer_id, contract_id, payment_date, amount)
WHERE invoice_id IS NULL;
;
