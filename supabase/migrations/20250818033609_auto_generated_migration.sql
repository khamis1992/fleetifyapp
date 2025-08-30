-- Create or replace the get_user_company function
CREATE OR REPLACE FUNCTION public.get_user_company(user_id_param uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = user_id_param
  LIMIT 1;
$$;

-- Enable RLS on all related tables
ALTER TABLE public.vehicle_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_installment_schedules ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.contract_vehicles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view vehicle installments in their company" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Managers can manage vehicle installments in their company" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Users can view installment schedules in their company" ON public.vehicle_installment_schedules;
DROP POLICY IF EXISTS "Managers can manage installment schedules in their company" ON public.vehicle_installment_schedules;
DROP POLICY IF EXISTS "Users can view contract vehicles in their company" ON public.contract_vehicles;
DROP POLICY IF EXISTS "Managers can manage contract vehicles in their company" ON public.contract_vehicles;

-- Create proper RLS policies for vehicle_installments
CREATE POLICY "Users can view vehicle installments in their company"
ON public.vehicle_installments
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage vehicle installments in their company"
ON public.vehicle_installments
FOR ALL
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

-- Create proper RLS policies for vehicle_installment_schedules
CREATE POLICY "Users can view installment schedules in their company"
ON public.vehicle_installment_schedules
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage installment schedules in their company"
ON public.vehicle_installment_schedules
FOR ALL
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

-- Create proper RLS policies for contract_vehicles
CREATE POLICY "Users can view contract vehicles in their company"
ON public.contract_vehicles
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage contract vehicles in their company"
ON public.contract_vehicles
FOR ALL
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