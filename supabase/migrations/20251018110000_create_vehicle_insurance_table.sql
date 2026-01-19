-- Create vehicle insurance table
CREATE TABLE IF NOT EXISTS public.fleet_vehicle_insurance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    insurance_company TEXT NOT NULL,
    insurance_company_ar TEXT,
    policy_number TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    premium_amount NUMERIC NOT NULL,
    coverage_amount NUMERIC,
    deductible_amount NUMERIC,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    policy_document_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT positive_premium_amount CHECK (premium_amount > 0),
    CONSTRAINT positive_coverage_amount CHECK (coverage_amount > 0),
    CONSTRAINT positive_deductible_amount CHECK (deductible_amount > 0),
    CONSTRAINT valid_policy_dates CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_insurance_company_id ON public.fleet_vehicle_insurance(company_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_insurance_vehicle_id ON public.fleet_vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_insurance_policy_number ON public.fleet_vehicle_insurance(policy_number);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_insurance_insurance_company ON public.fleet_vehicle_insurance(insurance_company);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_insurance_dates ON public.fleet_vehicle_insurance(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_insurance_is_active ON public.fleet_vehicle_insurance(is_active);

-- Enable RLS
ALTER TABLE public.fleet_vehicle_insurance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view fleet vehicle insurance in their company" 
ON public.fleet_vehicle_insurance 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can insert fleet vehicle insurance in their company" 
ON public.fleet_vehicle_insurance 
FOR INSERT 
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'fleet_manager'::user_role)
    ))
);

CREATE POLICY "Users can update fleet vehicle insurance in their company" 
ON public.fleet_vehicle_insurance 
FOR UPDATE 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'fleet_manager'::user_role)
    ))
);

CREATE POLICY "Users can delete fleet vehicle insurance in their company" 
ON public.fleet_vehicle_insurance 
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
CREATE TRIGGER update_fleet_vehicle_insurance_updated_at 
BEFORE UPDATE ON public.fleet_vehicle_insurance 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.fleet_vehicle_insurance IS 'Vehicle insurance policies and coverage information';
COMMENT ON COLUMN public.fleet_vehicle_insurance.company_id IS 'Company that owns this insurance record';
COMMENT ON COLUMN public.fleet_vehicle_insurance.vehicle_id IS 'Vehicle covered by this insurance policy';
COMMENT ON COLUMN public.fleet_vehicle_insurance.insurance_company IS 'Name of the insurance company';
COMMENT ON COLUMN public.fleet_vehicle_insurance.insurance_company_ar IS 'Arabic name of the insurance company';
COMMENT ON COLUMN public.fleet_vehicle_insurance.policy_number IS 'Unique insurance policy number';
COMMENT ON COLUMN public.fleet_vehicle_insurance.policy_type IS 'Type of insurance policy';
COMMENT ON COLUMN public.fleet_vehicle_insurance.start_date IS 'Policy start date';
COMMENT ON COLUMN public.fleet_vehicle_insurance.end_date IS 'Policy end date';
COMMENT ON COLUMN public.fleet_vehicle_insurance.premium_amount IS 'Insurance premium amount';
COMMENT ON COLUMN public.fleet_vehicle_insurance.coverage_amount IS 'Total coverage amount';
COMMENT ON COLUMN public.fleet_vehicle_insurance.deductible_amount IS 'Deductible amount';
COMMENT ON COLUMN public.fleet_vehicle_insurance.contact_person IS 'Insurance company contact person';
COMMENT ON COLUMN public.fleet_vehicle_insurance.contact_phone IS 'Insurance company contact phone';
COMMENT ON COLUMN public.fleet_vehicle_insurance.contact_email IS 'Insurance company contact email';
COMMENT ON COLUMN public.fleet_vehicle_insurance.policy_document_url IS 'URL to policy document';
COMMENT ON COLUMN public.fleet_vehicle_insurance.is_active IS 'Whether this insurance policy is currently active';
COMMENT ON COLUMN public.fleet_vehicle_insurance.notes IS 'Additional notes about the insurance policy';