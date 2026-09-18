
-- إصلاح التناقض في balance_due للفواتير غير المدفوعة
-- الفواتير التي لديها payment_status = 'unpaid' يجب أن يكون balance_due = total_amount
UPDATE invoices 
SET balance_due = total_amount,
    updated_at = NOW()
WHERE payment_status = 'unpaid' 
  AND (balance_due = 0 OR balance_due IS NULL)
  AND total_amount > 0;

-- إضافة تعليق للتوثيق
COMMENT ON COLUMN invoices.balance_due IS 'المبلغ المتبقي للدفع - يجب أن يساوي total_amount للفواتير غير المدفوعة';
;
