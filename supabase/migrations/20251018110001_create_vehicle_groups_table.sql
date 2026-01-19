-- Create vehicle groups table
CREATE TABLE IF NOT EXISTS public.fleet_vehicle_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    group_name_ar TEXT,
    description TEXT,
    manager_id UUID REFERENCES public.employees(id),
    parent_group_id UUID REFERENCES public.fleet_vehicle_groups(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_groups_company_id ON public.fleet_vehicle_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_groups_group_name ON public.fleet_vehicle_groups(group_name);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_groups_manager_id ON public.fleet_vehicle_groups(manager_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_groups_parent_group_id ON public.fleet_vehicle_groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_groups_is_active ON public.fleet_vehicle_groups(is_active);

-- Enable RLS
ALTER TABLE public.fleet_vehicle_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view fleet vehicle groups in their company" 
ON public.fleet_vehicle_groups 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can insert fleet vehicle groups in their company" 
ON public.fleet_vehicle_groups 
FOR INSERT 
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'fleet_manager'::user_role)
    ))
);

CREATE POLICY "Users can update fleet vehicle groups in their company" 
ON public.fleet_vehicle_groups 
FOR UPDATE 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'fleet_manager'::user_role)
    ))
);

CREATE POLICY "Users can delete fleet vehicle groups in their company" 
ON public.fleet_vehicle_groups 
FOR DELETE 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'fleet_manager'::user_role)
    ))
);

-- Update trigger
CREATE TRIGGER update_fleet_vehicle_groups_updated_at 
BEFORE UPDATE ON public.fleet_vehicle_groups 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.fleet_vehicle_groups IS 'Vehicle groups for organizing fleet vehicles';
COMMENT ON COLUMN public.fleet_vehicle_groups.company_id IS 'Company that owns this vehicle group';
COMMENT ON COLUMN public.fleet_vehicle_groups.group_name IS 'Name of the vehicle group';
COMMENT ON COLUMN public.fleet_vehicle_groups.group_name_ar IS 'Arabic name of the vehicle group';
COMMENT ON COLUMN public.fleet_vehicle_groups.description IS 'Description of the vehicle group';
COMMENT ON COLUMN public.fleet_vehicle_groups.manager_id IS 'Employee who manages this group';
COMMENT ON COLUMN public.fleet_vehicle_groups.parent_group_id IS 'Parent group for hierarchical organization';
COMMENT ON COLUMN public.fleet_vehicle_groups.is_active IS 'Whether this group is currently active';