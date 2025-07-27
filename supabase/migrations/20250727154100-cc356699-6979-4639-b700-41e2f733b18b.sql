-- إنشاء السياسات المفقودة للجداول الجديدة
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

CREATE POLICY "المديرون يمكنهم إدارة سجل أنشطة المركبات في شركتهم" 
ON public.vehicle_activity_log 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض سجل أنشطة المركبات في شركتهم" 
ON public.vehicle_activity_log 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));