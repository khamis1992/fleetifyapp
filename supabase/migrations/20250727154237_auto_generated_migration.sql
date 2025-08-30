-- حذف جميع السياسات الموجودة من الجداول الجديدة
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض قراءات العد" ON public.odometer_readings;
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة قراءات العداد" ON public.odometer_readings;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض قراءات العداد" ON public.odometer_readings;
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة قراءات العداد في شركتهم" ON public.odometer_readings;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض قراءات العداد في شركتهم" ON public.odometer_readings;

DROP POLICY IF EXISTS "المديرون يمكنهم إدارة تقييم المركبات" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض تقييم المركبات" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة تقييم المركبات في شركتهم" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض تقييم المركبات في شركتهم" ON public.vehicle_inspections;

DROP POLICY IF EXISTS "المديرون يمكنهم إدارة سجل أنشطة المركبات" ON public.vehicle_activity_log;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض سجل أنشطة المركبات" ON public.vehicle_activity_log;
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة سجل أنشطة المركبات في شركتهم" ON public.vehicle_activity_log;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض سجل أنشطة المركبات في شركتهم" ON public.vehicle_activity_log;

-- إنشاء السياسات الجديدة بأسماء فريدة
CREATE POLICY "fleet_odometer_admin_policy" 
ON public.odometer_readings 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "fleet_odometer_view_policy" 
ON public.odometer_readings 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "fleet_inspection_admin_policy" 
ON public.vehicle_inspections 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "fleet_inspection_view_policy" 
ON public.vehicle_inspections 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "fleet_activity_admin_policy" 
ON public.vehicle_activity_log 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "fleet_activity_view_policy" 
ON public.vehicle_activity_log 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));