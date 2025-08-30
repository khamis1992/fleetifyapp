-- Add RLS policies for vehicle_condition_reports table to give Super Admin full access

-- Enable RLS on vehicle_condition_reports if not already enabled
ALTER TABLE public.vehicle_condition_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can manage all vehicle condition reports" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Users can manage vehicle condition reports in their company" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Users can view vehicle condition reports in their company" ON public.vehicle_condition_reports;

-- Create comprehensive policies for vehicle condition reports
CREATE POLICY "Super admins can manage all vehicle condition reports"
ON public.vehicle_condition_reports
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Admins and managers can manage vehicle condition reports in their company"
ON public.vehicle_condition_reports
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR
  (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = vehicle_condition_reports.contract_id
    AND c.company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::user_role) OR
  (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = vehicle_condition_reports.contract_id
    AND c.company_id = get_user_company(auth.uid())
    AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  ))
);

CREATE POLICY "Users can view vehicle condition reports in their company"
ON public.vehicle_condition_reports
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR
  (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = vehicle_condition_reports.contract_id
    AND c.company_id = get_user_company(auth.uid())
  ))
);

-- Also ensure contracts table has proper Super Admin access
DROP POLICY IF EXISTS "Super admins can manage all contracts" ON public.contracts;

CREATE POLICY "Super admins can manage all contracts"
ON public.contracts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role);