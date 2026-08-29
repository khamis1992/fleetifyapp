-- حذف القيد المتعارض
-- القيد payments_payment_method_check يتطلب ('received', 'made') فقط
-- لكن النظام يرسل قيم مثل 'cash', 'bank_transfer' إلخ

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;

-- التأكد من أن القيد الصحيح موجود
-- payments_payment_method_valid يسمح بـ: cash, check, bank_transfer, credit_card, debit_card, online_transfer, other, received;
