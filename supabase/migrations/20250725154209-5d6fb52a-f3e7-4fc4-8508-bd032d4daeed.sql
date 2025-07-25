-- تحديث سياسة الحذف للمدير العام للسماح بحذف الحسابات النظامية
DROP POLICY IF EXISTS "Admins can delete non-system COA in their company" ON public.chart_of_accounts;

-- إنشاء سياسة جديدة تسمح للمدير العام بحذف الحسابات النظامية
CREATE POLICY "Admins can delete COA in their company" 
ON public.chart_of_accounts 
FOR DELETE 
USING (
  -- المدير العام يمكنه حذف جميع الحسابات
  has_role(auth.uid(), 'super_admin'::user_role) 
  OR 
  -- مديري الشركة يمكنهم حذف الحسابات غير النظامية فقط
  (
    (is_system = false) 
    AND (company_id = get_user_company(auth.uid())) 
    AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  )
);