-- Fix RLS policies for chart_of_accounts table to allow proper view, edit, and delete operations

-- Update the existing policy for admins to manage COA in their company
DROP POLICY IF EXISTS "Admins can manage COA in their company" ON public.chart_of_accounts;

CREATE POLICY "Admins can manage COA in their company" 
ON public.chart_of_accounts 
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (
    company_id = get_user_company(auth.uid()) AND 
    (
      has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (
    company_id = get_user_company(auth.uid()) AND 
    (
      has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)
    )
  )
);

-- Ensure staff can also edit accounts (not just view)
CREATE POLICY "Staff can update COA in their company" 
ON public.chart_of_accounts 
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (
    company_id = get_user_company(auth.uid()) AND 
    (
      has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR
      has_role(auth.uid(), 'sales_agent'::user_role)
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (
    company_id = get_user_company(auth.uid()) AND 
    (
      has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR
      has_role(auth.uid(), 'sales_agent'::user_role)
    )
  )
);

-- Create a policy for deleting accounts (only for non-system accounts)
CREATE POLICY "Admins can delete non-system COA in their company" 
ON public.chart_of_accounts 
FOR DELETE
USING (
  is_system = false AND (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (
      company_id = get_user_company(auth.uid()) AND 
      (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role)
      )
    )
  )
);