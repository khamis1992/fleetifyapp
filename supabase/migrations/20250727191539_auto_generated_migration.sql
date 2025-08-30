-- Add missing fields to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS manufacturer text,
ADD COLUMN IF NOT EXISTS purchase_source text,
ADD COLUMN IF NOT EXISTS branch_id uuid,
ADD COLUMN IF NOT EXISTS asset_code text,
ADD COLUMN IF NOT EXISTS asset_classification text DEFAULT 'vehicle',
ADD COLUMN IF NOT EXISTS depreciation_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS book_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS salvage_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS useful_life_years integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS financing_type text,
ADD COLUMN IF NOT EXISTS loan_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_payment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS warranty_expiry date,
ADD COLUMN IF NOT EXISTS service_interval_km integer DEFAULT 10000,
ADD COLUMN IF NOT EXISTS last_service_date date,
ADD COLUMN IF NOT EXISTS next_service_due date,
ADD COLUMN IF NOT EXISTS fuel_card_number text,
ADD COLUMN IF NOT EXISTS gps_device_id text,
ADD COLUMN IF NOT EXISTS assigned_driver_id uuid;

-- Create branches table for vehicle transfers
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    branch_code text NOT NULL,
    branch_name text NOT NULL,
    branch_name_ar text,
    manager_id uuid,
    address text,
    address_ar text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(company_id, branch_code)
);

-- Enable RLS on branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for branches
CREATE POLICY "Admins can manage branches in their company" 
ON public.branches 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "Users can view branches in their company" 
ON public.branches 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create enhanced vehicle insurance table (separate from vehicle_insurance)
CREATE TABLE IF NOT EXISTS public.vehicle_insurance_policies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    policy_type text NOT NULL CHECK (policy_type IN ('third_party', 'comprehensive', 'collision', 'theft')),
    insurance_company text NOT NULL,
    policy_number text NOT NULL,
    coverage_amount numeric NOT NULL DEFAULT 0,
    deductible_amount numeric DEFAULT 0,
    premium_amount numeric NOT NULL DEFAULT 0,
    premium_frequency text DEFAULT 'annual' CHECK (premium_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
    effective_date date NOT NULL,
    expiry_date date NOT NULL,
    agent_name text,
    agent_phone text,
    agent_email text,
    coverage_details jsonb DEFAULT '{}',
    documents jsonb DEFAULT '[]',
    is_active boolean DEFAULT true,
    auto_renew boolean DEFAULT false,
    renewal_notice_days integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on vehicle insurance policies
ALTER TABLE public.vehicle_insurance_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle insurance policies
CREATE POLICY "Staff can manage vehicle insurance in their company" 
ON public.vehicle_insurance_policies 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "Users can view vehicle insurance in their company" 
ON public.vehicle_insurance_policies 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Enhance vehicle pricing with limits and fines
ALTER TABLE public.vehicle_pricing
ADD COLUMN IF NOT EXISTS mileage_limit_daily integer DEFAULT 200,
ADD COLUMN IF NOT EXISTS mileage_limit_weekly integer DEFAULT 1400,
ADD COLUMN IF NOT EXISTS mileage_limit_monthly integer DEFAULT 6000,
ADD COLUMN IF NOT EXISTS excess_mileage_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_return_hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cleaning_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fuel_policy text DEFAULT 'full_to_full',
ADD COLUMN IF NOT EXISTS security_deposit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS peak_season_multiplier numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS weekend_multiplier numeric DEFAULT 1.0;

-- Create vehicle transfers table
CREATE TABLE IF NOT EXISTS public.vehicle_transfers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    from_branch_id uuid,
    to_branch_id uuid NOT NULL,
    transfer_date date NOT NULL DEFAULT CURRENT_DATE,
    requested_by uuid,
    approved_by uuid,
    transfer_reason text,
    odometer_reading integer,
    fuel_level numeric,
    condition_notes text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'cancelled')),
    completed_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on vehicle transfers
ALTER TABLE public.vehicle_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle transfers
CREATE POLICY "Staff can manage vehicle transfers in their company" 
ON public.vehicle_transfers 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "Users can view vehicle transfers in their company" 
ON public.vehicle_transfers 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create vehicle alerts table for insurance/maintenance notifications
CREATE TABLE IF NOT EXISTS public.vehicle_alerts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    alert_type text NOT NULL CHECK (alert_type IN ('insurance_expiry', 'maintenance_due', 'inspection_due', 'license_expiry', 'warranty_expiry', 'service_overdue')),
    alert_title text NOT NULL,
    alert_message text NOT NULL,
    due_date date,
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_acknowledged boolean DEFAULT false,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    auto_generated boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on vehicle alerts
ALTER TABLE public.vehicle_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle alerts
CREATE POLICY "Staff can manage vehicle alerts in their company" 
ON public.vehicle_alerts 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "Users can view vehicle alerts in their company" 
ON public.vehicle_alerts 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Add foreign key constraints
ALTER TABLE public.vehicles 
ADD CONSTRAINT fk_vehicles_branch 
FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE public.vehicles 
ADD CONSTRAINT fk_vehicles_assigned_driver 
FOREIGN KEY (assigned_driver_id) REFERENCES public.employees(id);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_insurance_policies_updated_at
    BEFORE UPDATE ON public.vehicle_insurance_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_transfers_updated_at
    BEFORE UPDATE ON public.vehicle_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_alerts_updated_at
    BEFORE UPDATE ON public.vehicle_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-generate vehicle alerts
CREATE OR REPLACE FUNCTION generate_vehicle_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    vehicle_record RECORD;
    insurance_record RECORD;
    alert_exists boolean;
BEGIN
    -- Check for insurance expiry alerts (30 days before expiry)
    FOR insurance_record IN 
        SELECT vip.*, v.plate_number, v.company_id
        FROM public.vehicle_insurance_policies vip
        JOIN public.vehicles v ON vip.vehicle_id = v.id
        WHERE vip.is_active = true
        AND vip.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND vip.expiry_date > CURRENT_DATE
    LOOP
        -- Check if alert already exists
        SELECT EXISTS(
            SELECT 1 FROM public.vehicle_alerts 
            WHERE vehicle_id = insurance_record.vehicle_id 
            AND alert_type = 'insurance_expiry'
            AND due_date = insurance_record.expiry_date
        ) INTO alert_exists;
        
        IF NOT alert_exists THEN
            INSERT INTO public.vehicle_alerts (
                company_id, vehicle_id, alert_type, alert_title, alert_message, due_date, priority
            ) VALUES (
                insurance_record.company_id,
                insurance_record.vehicle_id,
                'insurance_expiry',
                'Insurance Expiry Alert',
                'Insurance policy for vehicle ' || insurance_record.plate_number || ' expires on ' || insurance_record.expiry_date,
                insurance_record.expiry_date,
                CASE 
                    WHEN insurance_record.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
                    WHEN insurance_record.expiry_date <= CURRENT_DATE + INTERVAL '15 days' THEN 'high'
                    ELSE 'medium'
                END
            );
        END IF;
    END LOOP;
    
    -- Check for maintenance due alerts
    FOR vehicle_record IN 
        SELECT v.*, COALESCE(MAX(or_reading.odometer_reading), v.current_mileage, 0) as current_odometer
        FROM public.vehicles v
        LEFT JOIN public.odometer_readings or_reading ON v.id = or_reading.vehicle_id
        WHERE v.is_active = true
        AND v.service_interval_km > 0
        GROUP BY v.id
    LOOP
        -- Calculate next service mileage
        IF vehicle_record.last_service_date IS NOT NULL AND 
           vehicle_record.current_odometer >= (COALESCE(vehicle_record.current_mileage, 0) + vehicle_record.service_interval_km) THEN
            
            -- Check if alert already exists
            SELECT EXISTS(
                SELECT 1 FROM public.vehicle_alerts 
                WHERE vehicle_id = vehicle_record.id 
                AND alert_type = 'maintenance_due'
                AND created_at::date = CURRENT_DATE
            ) INTO alert_exists;
            
            IF NOT alert_exists THEN
                INSERT INTO public.vehicle_alerts (
                    company_id, vehicle_id, alert_type, alert_title, alert_message, priority
                ) VALUES (
                    vehicle_record.company_id,
                    vehicle_record.id,
                    'maintenance_due',
                    'Maintenance Due Alert',
                    'Vehicle ' || vehicle_record.plate_number || ' is due for maintenance',
                    'high'
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;