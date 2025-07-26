-- Update the RLS policy to allow Company Admins to delete system accounts within their company
DROP POLICY IF EXISTS "Admins can delete COA in their company" ON public.chart_of_accounts;

CREATE POLICY "Admins can delete COA in their company"
ON public.chart_of_accounts
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::user_role) 
  OR (
    company_id = get_user_company(auth.uid()) 
    AND (
      has_role(auth.uid(), 'company_admin'::user_role) 
      OR (
        has_role(auth.uid(), 'manager'::user_role) 
        AND is_system = false
      )
    )
  )
);