-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض قراءات العد" ON public.odometer_readings;
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة قراءات العداد" ON public.odometer_readings;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض قراءات العداد" ON public.odometer_readings;

-- إعادة إنشاء السياسات بشكل صحيح
CREATE POLICY "المديرون يمكنهم إدارة قراءات العداد في شركتهم" 
ON public.odometer_readings 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض قراءات العداد في شركتهم" 
ON public.odometer_readings 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- سياسات الأمان لتقييم المركبات
CREATE POLICY "المديرون يمكنهم إدارة تقييم المركبات في شركتهم" 
ON public.vehicle_inspections 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض تقييم المركبات في شركتهم" 
ON public.vehicle_inspections 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- سياسات الأمان للغرامات المرورية
CREATE POLICY "المديرون يمكنهم إدارة الغرامات المرورية في شركتهم" 
ON public.traffic_violations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض الغرامات المرورية في شركتهم" 
ON public.traffic_violations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- تحديث جدول المركبات لإضافة تريجر الأحداث المالية إذا لم يكن موجود
CREATE OR REPLACE FUNCTION public.handle_vehicle_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- تحديث حالة المركبة عند انتهاء العقد
    IF NEW.status = 'available' AND OLD.status = 'rented' THEN
        -- تسجيل عودة المركبة في سجل الأنشطة
        INSERT INTO public.vehicle_activity_log (
            vehicle_id, 
            activity_type, 
            description, 
            activity_date,
            company_id
        ) VALUES (
            NEW.id,
            'returned',
            'Vehicle returned from rental',
            CURRENT_DATE,
            NEW.company_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء جدول سجل أنشطة المركبات
CREATE TABLE IF NOT EXISTS public.vehicle_activity_log (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    description text,
    activity_date date NOT NULL DEFAULT CURRENT_DATE,
    activity_time time DEFAULT CURRENT_TIME,
    mileage integer,
    location text,
    performed_by uuid REFERENCES auth.users(id),
    cost_amount numeric DEFAULT 0,
    cost_center_id uuid REFERENCES public.cost_centers(id),
    reference_document text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- إضافة فهرس وتريجر لجدول سجل الأنشطة
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_vehicle_date ON public.vehicle_activity_log(vehicle_id, activity_date DESC);

CREATE TRIGGER update_vehicle_activity_log_updated_at
    BEFORE UPDATE ON public.vehicle_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- إضافة RLS لجدول سجل الأنشطة
ALTER TABLE public.vehicle_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المديرون يمكنهم إدارة سجل أنشطة المركبات" 
ON public.vehicle_activity_log 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض سجل أنشطة المركبات" 
ON public.vehicle_activity_log 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));