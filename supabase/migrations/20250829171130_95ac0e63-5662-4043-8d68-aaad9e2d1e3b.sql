-- إصلاح سياسة إنشاء تقارير حالة المركبات للـ Super Admin
DROP POLICY IF EXISTS "Allow updates to vehicle condition reports" ON public.vehicle_condition_reports;

-- إنشاء سياسة محدثة للـ INSERT تسمح للـ Super Admin
CREATE POLICY "Allow creating vehicle condition reports" ON public.vehicle_condition_reports
FOR INSERT 
WITH CHECK (
  -- Super Admin يمكنه إنشاء أي تقرير
  has_role(auth.uid(), 'super_admin') OR
  -- أو المفتش المصرح له في نفس الشركة
  (
    inspector_id = auth.uid() AND 
    company_id = get_user_company(auth.uid())
  ) OR
  -- أو مدير الشركة/المدير في نفس الشركة
  (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
  )
);

-- إنشاء سياسة محدثة للـ UPDATE تسمح للـ Super Admin
CREATE POLICY "Allow updating vehicle condition reports" ON public.vehicle_condition_reports
FOR UPDATE 
USING (
  -- Super Admin يمكنه تعديل أي تقرير
  has_role(auth.uid(), 'super_admin') OR
  -- أو المفتش المصرح له في نفس الشركة
  (
    inspector_id = auth.uid() AND 
    company_id = get_user_company(auth.uid())
  ) OR
  -- أو مدير الشركة/المدير في نفس الشركة
  (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
  )
)
WITH CHECK (
  -- نفس شروط الـ INSERT
  has_role(auth.uid(), 'super_admin') OR
  (
    inspector_id = auth.uid() AND 
    company_id = get_user_company(auth.uid())
  ) OR
  (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
  )
);