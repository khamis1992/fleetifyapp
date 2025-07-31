-- Fix RLS policies for vendors table to include super_admin role
-- Drop existing policies
DROP POLICY IF EXISTS "Staff can manage vendors in their company" ON public.vendors;
DROP POLICY IF EXISTS "Users can view vendors in their company" ON public.vendors;

-- Create improved policies that include super_admin
CREATE POLICY "Admins can manage vendors in their company" 
ON public.vendors FOR ALL
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

CREATE POLICY "Users can view vendors in their company" 
ON public.vendors FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  company_id = get_user_company(auth.uid())
);