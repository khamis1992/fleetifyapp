-- إصلاح مشكلة اختفاء شركة النظام - الجزء الثالث: حذف جميع السياسات المتضاربة

-- حذف جميع السياسات الموجودة للعملاء
DROP POLICY IF EXISTS "مديرو النظام يمكنهم إدارة جميع العملاء" ON public.customers;
DROP POLICY IF EXISTS "مديرو النظام يمكنهم إدارة جميع الع" ON public.customers;
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة العملاء في شركاتهم" ON public.customers;
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض العملاء في شركاتهم" ON public.customers;
DROP POLICY IF EXISTS "Company admins can manage customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Employees can manage customers in their company" ON public.customers;

-- حذف السياسات القديمة للعقود أيضاً
DROP POLICY IF EXISTS "Admins can manage contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Staff can create contracts in their company" ON public.contracts;

-- إنشاء سياسات RLS جديدة ومحسنة للعملاء
CREATE POLICY "super_admins_manage_all_customers"
ON public.customers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "company_staff_manage_customers"
ON public.customers FOR ALL
TO authenticated
USING (
    company_id = public.get_user_company_safe(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    )
)
WITH CHECK (
    company_id = public.get_user_company_safe(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    )
);

CREATE POLICY "users_view_company_customers"
ON public.customers FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_safe(auth.uid()));

-- إنشاء سياسات محسنة للعقود
CREATE POLICY "super_admins_manage_all_contracts"
ON public.contracts FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "company_staff_manage_contracts"
ON public.contracts FOR ALL
TO authenticated
USING (
    company_id = public.get_user_company_safe(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    )
)
WITH CHECK (
    company_id = public.get_user_company_safe(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    )
);