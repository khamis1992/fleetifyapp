-- خطة الإصلاح الشاملة لنظام المدفوعات
-- 1. حذف القيود المتضاربة
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- 2. إعادة تنظيم المفاهيم:
-- payment_method: نوع العملية ('received' للقبضات، 'made' للمدفوعات)
-- payment_type: طريقة الدفع ('cash', 'check', 'bank_transfer', 'credit_card')

-- 3. إضافة القيود الجديدة الصحيحة
ALTER TABLE public.payments 
ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method IN ('received', 'made'));

ALTER TABLE public.payments 
ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type IN ('cash', 'check', 'bank_transfer', 'credit_card', 'online_transfer'));

-- 4. تحديث البيانات الموجودة لتتماشى مع المفهوم الجديد
-- تحويل البيانات الحالية حسب نوع المعاملة
UPDATE public.payments 
SET payment_method = CASE 
    WHEN payment_method = 'cash' OR payment_method = 'check' OR payment_method = 'bank_transfer' OR payment_method = 'credit_card' 
    THEN CASE 
        WHEN amount > 0 THEN 'received'
        ELSE 'made'
    END
    ELSE payment_method
END
WHERE payment_method NOT IN ('received', 'made');

-- 5. التأكد من أن payment_type تحتوي على قيم صحيحة
UPDATE public.payments 
SET payment_type = CASE 
    WHEN payment_type NOT IN ('cash', 'check', 'bank_transfer', 'credit_card', 'online_transfer')
    THEN 'cash' -- قيمة افتراضية
    ELSE payment_type
END;