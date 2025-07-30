-- إصلاح قيد payment_status ليشمل القيمة 'completed'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- إضافة القيد المحدث الذي يشمل 'completed'
ALTER TABLE public.payments 
ADD CONSTRAINT payments_status_check 
CHECK (payment_status IN ('pending', 'completed', 'cleared', 'bounced', 'cancelled'));