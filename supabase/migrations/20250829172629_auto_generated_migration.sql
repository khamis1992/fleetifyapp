-- حذف جميع السياسات الموجودة للعملاء
DROP POLICY IF EXISTS "Super admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Company admins can manage customers in their company" ON public.customers;  
DROP POLICY IF EXISTS "Staff can manage customers in their company" ON public.customers;

-- إنشاء سياسة واحدة شاملة ومرتبة بأولوية واضحة
CREATE POLICY "Customer management policy" ON public.customers
FOR ALL
TO authenticated
USING (
  -- أولوية أولى: السوبر أدمن لديه وصول كامل لجميع العملاء
  has_role(auth.uid(), 'super_admin') OR
  -- أولوية ثانية: مديرو الشركات والمدراء يمكنهم إدارة عملاء شركتهم فقط
  (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
  ) OR
  -- أولوية ثالثة: الموظفون يمكنهم إدارة عملاء شركتهم فقط
  (
    company_id = get_user_company(auth.uid()) AND 
    has_role(auth.uid(), 'sales_agent')
  )
)
WITH CHECK (
  -- نفس شروط USING للـ INSERT/UPDATE
  has_role(auth.uid(), 'super_admin') OR
  (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
  ) OR
  (
    company_id = get_user_company(auth.uid()) AND 
    has_role(auth.uid(), 'sales_agent')
  )
);