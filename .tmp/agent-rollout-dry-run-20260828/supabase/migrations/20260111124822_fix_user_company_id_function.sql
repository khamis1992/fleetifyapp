
-- إصلاح دالة user_company_id للبحث بـ user_id بدلاً من id
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

-- تحديث سياسات RLS التي تستخدم profiles.id = auth.uid() بشكل خاطئ

-- إصلاح invoices_select_policy
DROP POLICY IF EXISTS "invoices_select_policy" ON invoices;
CREATE POLICY "invoices_select_policy" ON invoices
FOR SELECT
USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE profiles.user_id = auth.uid()
    )
);

-- إصلاح invoices_update_policy
DROP POLICY IF EXISTS "invoices_update_policy" ON invoices;
CREATE POLICY "invoices_update_policy" ON invoices
FOR UPDATE
USING (
    (company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE profiles.user_id = auth.uid()
    ))
    AND (auth.uid() IN (
        SELECT user_roles.user_id
        FROM user_roles
        WHERE user_roles.role = ANY(ARRAY['super_admin'::user_role, 'company_admin'::user_role])
    ))
);

-- إصلاح invoices_delete_policy
DROP POLICY IF EXISTS "invoices_delete_policy" ON invoices;
CREATE POLICY "invoices_delete_policy" ON invoices
FOR DELETE
USING (
    (company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE profiles.user_id = auth.uid()
    ))
    AND (auth.uid() IN (
        SELECT user_roles.user_id
        FROM user_roles
        WHERE user_roles.role = 'super_admin'::user_role
    ))
    AND (payment_status <> 'paid'::text)
);

COMMENT ON FUNCTION public.user_company_id() IS 'Returns the company_id of the current authenticated user based on their profile';
;
