-- Add missing vehicle fields to the vehicles table (only new ones)
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS chassis_number TEXT,
ADD COLUMN IF NOT EXISTS drive_type TEXT DEFAULT 'front_wheel',
ADD COLUMN IF NOT EXISTS vehicle_category TEXT DEFAULT 'sedan',
ADD COLUMN IF NOT EXISTS inspection_due_date DATE,
ADD COLUMN IF NOT EXISTS current_location TEXT,
ADD COLUMN IF NOT EXISTS gps_tracking_device TEXT,
ADD COLUMN IF NOT EXISTS entertainment_features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS comfort_features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vehicle_condition TEXT DEFAULT 'good',
ADD COLUMN IF NOT EXISTS ownership_status TEXT DEFAULT 'owned',
ADD COLUMN IF NOT EXISTS lease_start_date DATE,
ADD COLUMN IF NOT EXISTS lease_end_date DATE,
ADD COLUMN IF NOT EXISTS monthly_lease_amount NUMERIC,
ADD COLUMN IF NOT EXISTS lease_company TEXT,
ADD COLUMN IF NOT EXISTS expected_depreciation_rate NUMERIC,
ADD COLUMN IF NOT EXISTS total_fuel_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_fuel_consumption NUMERIC,
ADD COLUMN IF NOT EXISTS total_distance_km INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_contact_info JSONB,
ADD COLUMN IF NOT EXISTS maintenance_schedule JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS performance_metrics JSONB,
ADD COLUMN IF NOT EXISTS journal_entry_id UUID;

-- Create vehicle_categories table for better organization
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    category_name TEXT NOT NULL,
    category_name_ar TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_insurance table for detailed insurance tracking
CREATE TABLE IF NOT EXISTS public.vehicle_insurance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    insurance_company TEXT NOT NULL,
    insurance_company_ar TEXT,
    policy_number TEXT NOT NULL,
    policy_type TEXT DEFAULT 'comprehensive',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    premium_amount NUMERIC NOT NULL DEFAULT 0,
    coverage_amount NUMERIC,
    deductible_amount NUMERIC DEFAULT 0,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    policy_document_url TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_groups table for fleet organization
CREATE TABLE IF NOT EXISTS public.vehicle_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    group_name_ar TEXT,
    description TEXT,
    manager_id UUID,
    parent_group_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_group_assignments table
CREATE TABLE IF NOT EXISTS public.vehicle_group_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL,
    group_id UUID NOT NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enhanced vehicle_branches table
CREATE TABLE IF NOT EXISTS public.vehicle_branches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    branch_name TEXT NOT NULL,
    branch_name_ar TEXT,
    address TEXT,
    address_ar TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    manager_id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    working_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_branch_assignments table
CREATE TABLE IF NOT EXISTS public.vehicle_branch_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enhanced odometer_readings table (if not exists)
CREATE TABLE IF NOT EXISTS public.odometer_readings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
    odometer_reading INTEGER NOT NULL,
    fuel_level NUMERIC,
    location TEXT,
    notes TEXT,
    recorded_by UUID,
    verification_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_inspections table
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    inspection_date DATE NOT NULL,
    inspection_type TEXT NOT NULL DEFAULT 'routine',
    inspector_name TEXT,
    inspector_license TEXT,
    result TEXT DEFAULT 'pending',
    notes TEXT,
    next_inspection_date DATE,
    certificate_number TEXT,
    certificate_expiry DATE,
    cost NUMERIC DEFAULT 0,
    inspection_report JSONB,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_activity_log table
CREATE TABLE IF NOT EXISTS public.vehicle_activity_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    activity_date DATE DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    details JSONB,
    performed_by UUID,
    cost NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for new tables
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Companies can manage their vehicle categories" ON public.vehicle_categories
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Companies can manage their vehicle insurance" ON public.vehicle_insurance
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Companies can manage their vehicle groups" ON public.vehicle_groups
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Companies can manage vehicle group assignments" ON public.vehicle_group_assignments
FOR ALL USING (EXISTS (
    SELECT 1 FROM public.vehicles v 
    WHERE v.id = vehicle_group_assignments.vehicle_id 
    AND v.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Companies can manage their vehicle branches" ON public.vehicle_branches
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Companies can manage vehicle branch assignments" ON public.vehicle_branch_assignments
FOR ALL USING (EXISTS (
    SELECT 1 FROM public.vehicles v 
    WHERE v.id = vehicle_branch_assignments.vehicle_id 
    AND v.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Companies can manage their odometer readings" ON public.odometer_readings
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Companies can manage their vehicle inspections" ON public.vehicle_inspections
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Companies can manage their vehicle activity log" ON public.vehicle_activity_log
FOR ALL USING (company_id = get_user_company(auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_company ON public.vehicle_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle ON public.vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_groups_company ON public.vehicle_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_branches_company ON public.vehicle_branches(company_id);
CREATE INDEX IF NOT EXISTS idx_odometer_readings_vehicle_date ON public.odometer_readings(vehicle_id, reading_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON public.vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_vehicle ON public.vehicle_activity_log(vehicle_id);

-- Add trigger to update updated_at columns
CREATE TRIGGER update_vehicle_categories_updated_at
    BEFORE UPDATE ON public.vehicle_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_insurance_updated_at
    BEFORE UPDATE ON public.vehicle_insurance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_groups_updated_at
    BEFORE UPDATE ON public.vehicle_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_branches_updated_at
    BEFORE UPDATE ON public.vehicle_branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_inspections_updated_at
    BEFORE UPDATE ON public.vehicle_inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();