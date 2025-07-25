-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage COA in their company" ON public.chart_of_accounts;

-- Create updated policy that includes super_admin role
CREATE POLICY "Admins can manage COA in their company" ON public.chart_of_accounts
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);