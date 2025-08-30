-- إضافة سياسة RLS للسماح بتحديث تقارير حالة المركبات للمستخدمين المصرح لهم
DROP POLICY IF EXISTS "Users can update vehicle condition reports" ON public.vehicle_condition_reports;

CREATE POLICY "Users can update vehicle condition reports" 
ON public.vehicle_condition_reports 
FOR UPDATE 
USING (
  -- السماح للمستخدم إذا كان مفتش التقرير
  auth.uid() = inspector_id OR
  -- أو إذا كان لديه صلاحية super_admin
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'super_admin'
  ) OR
  -- أو إذا كان مدير في نفس الشركة
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.user_id = ur.user_id
    WHERE p.user_id = auth.uid() 
    AND p.company_id = vehicle_condition_reports.company_id
    AND ur.role IN ('company_admin', 'manager')
  )
);