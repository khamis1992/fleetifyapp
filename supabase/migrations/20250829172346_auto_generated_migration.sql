-- حذف السياسات المتضاربة للعملاء
DROP POLICY IF EXISTS "Admins can manage customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Staff can manage customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Super admins have absolute access to customers" ON public.customers;

-- إنشاء سياسات جديدة ومحسّنة للعملاء
-- السوبر أدمن لديه وصول كامل ومطلق
CREATE POLICY "Super admins can manage all customers" ON public.customers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- مديرو الشركات يمكنهم إدارة عملاء شركتهم فقط
CREATE POLICY "Company admins can manage customers in their company" ON public.customers
FOR ALL
TO authenticated
USING (
  NOT has_role(auth.uid(), 'super_admin') AND
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  NOT has_role(auth.uid(), 'super_admin') AND
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
);

-- الموظفون يمكنهم إدارة عملاء شركتهم
CREATE POLICY "Staff can manage customers in their company" ON public.customers
FOR ALL
TO authenticated
USING (
  NOT has_role(auth.uid(), 'super_admin') AND
  company_id = get_user_company(auth.uid()) AND 
  has_role(auth.uid(), 'sales_agent')
)
WITH CHECK (
  NOT has_role(auth.uid(), 'super_admin') AND
  company_id = get_user_company(auth.uid()) AND 
  has_role(auth.uid(), 'sales_agent')
);