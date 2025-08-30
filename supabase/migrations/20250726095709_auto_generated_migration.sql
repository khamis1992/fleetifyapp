-- Grant Super Admins absolute permissions on key tables

-- Update customers table RLS policies
DROP POLICY IF EXISTS "Staff can manage customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;

CREATE POLICY "Super admins have full access to customers" ON public.customers
FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Staff can manage customers in their company" ON public.customers
FOR ALL USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'company_admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Users can view customers in their company" ON public.customers
FOR SELECT USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid())
);

-- Update contracts table RLS policies
DROP POLICY IF EXISTS "Staff can manage contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Users can view contracts in their company" ON public.contracts;

CREATE POLICY "Super admins have full access to contracts" ON public.contracts
FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Staff can manage contracts in their company" ON public.contracts
FOR ALL USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'company_admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Users can view contracts in their company" ON public.contracts
FOR SELECT USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid())
);

-- Update vehicles table RLS policies
DROP POLICY IF EXISTS "Staff can manage vehicles in their company" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON public.vehicles;

CREATE POLICY "Super admins have full access to vehicles" ON public.vehicles
FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Staff can manage vehicles in their company" ON public.vehicles
FOR ALL USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'company_admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Users can view vehicles in their company" ON public.vehicles
FOR SELECT USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid())
);

-- Update invoices table RLS policies
DROP POLICY IF EXISTS "Staff can manage invoices in their company" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices in their company" ON public.invoices;

CREATE POLICY "Super admins have full access to invoices" ON public.invoices
FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Staff can manage invoices in their company" ON public.invoices
FOR ALL USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'company_admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Users can view invoices in their company" ON public.invoices
FOR SELECT USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid())
);

-- Update payments table RLS policies  
DROP POLICY IF EXISTS "Staff can manage payments in their company" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments in their company" ON public.payments;

CREATE POLICY "Super admins have full access to payments" ON public.payments
FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Staff can manage payments in their company" ON public.payments
FOR ALL USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid()) AND 
  (has_role(auth.uid(), 'company_admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Users can view payments in their company" ON public.payments
FOR SELECT USING (
  NOT has_role(auth.uid(), 'super_admin'::user_role) AND 
  company_id = get_user_company(auth.uid())
);