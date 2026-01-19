-- Fix Super Admin permissions for vehicle condition reports by cleaning up conflicting RLS policies

-- Drop ALL existing policies on vehicle_condition_reports table to clean up conflicts
DROP POLICY IF EXISTS "Super admins can manage all vehicle condition reports" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Admins and managers can manage vehicle condition reports in their company" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Users can view vehicle condition reports in their company" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Users can manage vehicle condition reports in their company" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vehicle_condition_reports;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.vehicle_condition_reports;

-- Make sure RLS is enabled
ALTER TABLE public.vehicle_condition_reports ENABLE ROW LEVEL SECURITY;

-- Create clean, prioritized policies starting with Super Admin (highest priority)
CREATE POLICY "1_super_admin_full_access_vehicle_condition_reports"
ON public.vehicle_condition_reports
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

-- Company admins and managers can manage reports in their company
CREATE POLICY "2_company_admin_manage_vehicle_condition_reports" 
ON public.vehicle_condition_reports
FOR ALL
TO authenticated
USING (
  -- Allow if user is company admin/manager and the permit belongs to their company
  (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  AND EXISTS (
    SELECT 1 FROM public.vehicle_dispatch_permits p
    WHERE p.id = vehicle_condition_reports.permit_id
    AND p.company_id = get_user_company(auth.uid())
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  AND EXISTS (
    SELECT 1 FROM public.vehicle_dispatch_permits p
    WHERE p.id = vehicle_condition_reports.permit_id
    AND p.company_id = get_user_company(auth.uid())
  )
);

-- All users can view reports in their company
CREATE POLICY "3_users_view_vehicle_condition_reports"
ON public.vehicle_condition_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_dispatch_permits p
    WHERE p.id = vehicle_condition_reports.permit_id
    AND p.company_id = get_user_company(auth.uid())
  )
);

-- Also ensure contracts table has proper Super Admin access without conflicts
DROP POLICY IF EXISTS "Super admins can manage all contracts" ON public.contracts;

CREATE POLICY "1_super_admin_full_access_contracts"
ON public.contracts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));