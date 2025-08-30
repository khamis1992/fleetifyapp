-- Fix RLS policies without using NEW keyword which isn't valid in policies
DROP POLICY IF EXISTS "Users can view vehicle installments in their company" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Managers can manage vehicle installments in their company" ON public.vehicle_installments;

-- Create improved policies
CREATE POLICY "Users can view vehicle installments in their company"
ON public.vehicle_installments
FOR SELECT
USING (
    -- Allow if user is authenticated and has access to the company
    (auth.uid() IS NOT NULL 
     AND get_user_company_safe(auth.uid()) IS NOT NULL 
     AND company_id = get_user_company_safe(auth.uid()))
    -- OR if user is super admin with browsing access
    OR (auth.uid() IS NOT NULL 
        AND has_role(auth.uid(), 'super_admin'::user_role))
);

CREATE POLICY "Managers can manage vehicle installments in their company"
ON public.vehicle_installments
FOR ALL
USING (
    auth.uid() IS NOT NULL 
    AND (
        -- Super admin can access all
        has_role(auth.uid(), 'super_admin'::user_role) 
        -- Or user has company admin/manager/sales role for their company
        OR (
            get_user_company_safe(auth.uid()) IS NOT NULL 
            AND company_id = get_user_company_safe(auth.uid())
            AND (
                has_role(auth.uid(), 'company_admin'::user_role) 
                OR has_role(auth.uid(), 'manager'::user_role) 
                OR has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
        has_role(auth.uid(), 'super_admin'::user_role) 
        OR (
            get_user_company_safe(auth.uid()) IS NOT NULL 
            AND company_id = get_user_company_safe(auth.uid())
            AND (
                has_role(auth.uid(), 'company_admin'::user_role) 
                OR has_role(auth.uid(), 'manager'::user_role) 
                OR has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    )
);