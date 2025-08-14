-- إزالة الحقول المتكررة من جدول المركبات
-- إزالة حقل manufacturer (نحتفظ بـ make)
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS manufacturer;

-- إزالة حقل chassis_number (نحتفظ بـ vin)
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS chassis_number;

-- إزالة حقل transmission (نحتفظ بـ transmission_type)
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS transmission;

-- إضافة تعليق للتوضيح
COMMENT ON COLUMN public.vehicles.make IS 'الماركة/الشركة المصنعة للمركبة';
COMMENT ON COLUMN public.vehicles.vin IS 'رقم الهيكل - Vehicle Identification Number';
COMMENT ON COLUMN public.vehicles.transmission_type IS 'نوع ناقل الحركة';

-- تحديث الدالة المحدثة للمركبة إذا لزم الأمر
CREATE OR REPLACE FUNCTION public.update_vehicle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;