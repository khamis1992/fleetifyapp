-- إضافة حقول المخالفات المرورية لجدول penalties
ALTER TABLE public.penalties 
ADD COLUMN IF NOT EXISTS violation_type TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- إضافة قيود التحقق لحالة الدفع
ALTER TABLE public.penalties 
ADD CONSTRAINT penalties_payment_status_check 
CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid'));

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_penalties_violation_type ON public.penalties(violation_type);
CREATE INDEX IF NOT EXISTS idx_penalties_payment_status ON public.penalties(payment_status);
CREATE INDEX IF NOT EXISTS idx_penalties_vehicle_plate ON public.penalties(vehicle_plate);

-- تحديث الحقول الموجودة لتكون متوافقة مع المخالفات المرورية
COMMENT ON COLUMN public.penalties.violation_type IS 'نوع المخالفة المرورية';
COMMENT ON COLUMN public.penalties.location IS 'موقع المخالفة';
COMMENT ON COLUMN public.penalties.vehicle_plate IS 'رقم لوحة المركبة';
COMMENT ON COLUMN public.penalties.payment_status IS 'حالة دفع المخالفة';