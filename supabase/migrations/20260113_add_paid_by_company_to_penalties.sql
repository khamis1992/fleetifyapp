-- إضافة حقل لتتبع المخالفات المدفوعة من الشركة
-- هذا الحقل يسمح بالتفريق بين الدفع للجهة الحكومية والدفع من العميل

ALTER TABLE penalties 
ADD COLUMN IF NOT EXISTS paid_by_company boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_paid_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS customer_payment_status text DEFAULT 'unpaid';

-- إضافة تعليق للتوضيح
COMMENT ON COLUMN penalties.paid_by_company IS 'هل تم دفع المخالفة من قبل الشركة؟';
COMMENT ON COLUMN penalties.company_paid_date IS 'تاريخ دفع الشركة للمخالفة';
COMMENT ON COLUMN penalties.customer_payment_status IS 'حالة الدفع من العميل: unpaid, paid, partially_paid';

-- تحديث المخالفات الحالية المدفوعة
-- إذا كانت payment_status = 'paid' ولا يوجد customer_id، نفترض أن الشركة دفعتها
UPDATE penalties 
SET 
  paid_by_company = true,
  company_paid_date = updated_at,
  customer_payment_status = 'unpaid'
WHERE payment_status = 'paid' 
  AND customer_id IS NULL 
  AND paid_by_company IS NULL;

-- إذا كانت payment_status = 'paid' ويوجد customer_id، نفترض أن العميل دفعها
UPDATE penalties 
SET 
  paid_by_company = false,
  customer_payment_status = 'paid'
WHERE payment_status = 'paid' 
  AND customer_id IS NOT NULL 
  AND paid_by_company IS NULL;

-- المخالفات غير المدفوعة
UPDATE penalties 
SET 
  paid_by_company = false,
  customer_payment_status = 'unpaid'
WHERE payment_status != 'paid' 
  AND paid_by_company IS NULL;
