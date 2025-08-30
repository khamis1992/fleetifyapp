-- Fleet Management Database Migration (Fixed)

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE maintenance_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE insurance_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update vehicles table with comprehensive fleet management fields
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission text DEFAULT 'automatic';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS body_type text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type text DEFAULT 'gasoline';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seating_capacity integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_mileage numeric DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_service_mileage numeric DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_service_mileage numeric;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_cost numeric;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS useful_life_years integer DEFAULT 10;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS residual_value numeric DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS depreciation_method text DEFAULT 'straight_line';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS annual_depreciation_rate numeric;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS accumulated_depreciation numeric DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS book_value numeric;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fixed_asset_id uuid;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS cost_center_id uuid;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_maintenance_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create vehicle_pricing table
CREATE TABLE IF NOT EXISTS vehicle_pricing (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL,
    daily_rate numeric NOT NULL DEFAULT 0,
    weekly_rate numeric NOT NULL DEFAULT 0,
    monthly_rate numeric NOT NULL DEFAULT 0,
    annual_rate numeric NOT NULL DEFAULT 0,
    daily_rate_min numeric,
    daily_rate_max numeric,
    weekly_rate_min numeric,
    weekly_rate_max numeric,
    monthly_rate_min numeric,
    monthly_rate_max numeric,
    annual_rate_min numeric,
    annual_rate_max numeric,
    extra_km_charge numeric DEFAULT 0,
    included_km_daily integer DEFAULT 0,
    included_km_weekly integer DEFAULT 0,
    included_km_monthly integer DEFAULT 0,
    included_km_annual integer DEFAULT 0,
    security_deposit numeric DEFAULT 0,
    currency text DEFAULT 'KWD',
    effective_from date DEFAULT CURRENT_DATE,
    effective_to date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create vehicle_insurance table
CREATE TABLE IF NOT EXISTS vehicle_insurance (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL,
    insurance_company text NOT NULL,
    policy_number text NOT NULL,
    coverage_type text NOT NULL,
    coverage_amount numeric,
    deductible_amount numeric DEFAULT 0,
    premium_amount numeric NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status insurance_status DEFAULT 'active',
    contact_person text,
    contact_phone text,
    contact_email text,
    policy_document_url text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create vehicle_maintenance table
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL,
    company_id uuid NOT NULL,
    maintenance_number text NOT NULL,
    maintenance_type text NOT NULL,
    description text NOT NULL,
    priority maintenance_priority DEFAULT 'medium',
    status maintenance_status DEFAULT 'pending',
    scheduled_date date,
    started_date date,
    completed_date date,
    estimated_cost numeric DEFAULT 0,
    actual_cost numeric DEFAULT 0,
    mileage_at_service numeric,
    service_provider text,
    service_provider_contact text,
    warranty_until date,
    parts_replaced text[],
    cost_center_id uuid,
    invoice_id uuid,
    journal_entry_id uuid,
    created_by uuid,
    assigned_to uuid,
    notes text,
    attachments jsonb DEFAULT '[]',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL,
    document_type text NOT NULL,
    document_name text NOT NULL,
    document_url text NOT NULL,
    issue_date date,
    expiry_date date,
    issuing_authority text,
    document_number text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create maintenance_checklist table
CREATE TABLE IF NOT EXISTS maintenance_checklist (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    maintenance_id uuid NOT NULL,
    item_name text NOT NULL,
    item_description text,
    is_completed boolean DEFAULT false,
    completed_by uuid,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE vehicle_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_checklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle_pricing
DROP POLICY IF EXISTS "Users can view vehicle pricing in their company" ON vehicle_pricing;
DROP POLICY IF EXISTS "Staff can manage vehicle pricing in their company" ON vehicle_pricing;

CREATE POLICY "Users can view vehicle pricing in their company" ON vehicle_pricing
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vehicles v 
            WHERE v.id = vehicle_pricing.vehicle_id 
            AND v.company_id = get_user_company(auth.uid())
        )
    );

CREATE POLICY "Staff can manage vehicle pricing in their company" ON vehicle_pricing
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR (
            EXISTS (
                SELECT 1 FROM vehicles v 
                WHERE v.id = vehicle_pricing.vehicle_id 
                AND v.company_id = get_user_company(auth.uid())
            ) AND (
                has_role(auth.uid(), 'company_admin'::user_role) OR 
                has_role(auth.uid(), 'manager'::user_role) OR 
                has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    );

-- Create RLS policies for vehicle_insurance
DROP POLICY IF EXISTS "Users can view vehicle insurance in their company" ON vehicle_insurance;
DROP POLICY IF EXISTS "Staff can manage vehicle insurance in their company" ON vehicle_insurance;

CREATE POLICY "Users can view vehicle insurance in their company" ON vehicle_insurance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vehicles v 
            WHERE v.id = vehicle_insurance.vehicle_id 
            AND v.company_id = get_user_company(auth.uid())
        )
    );

CREATE POLICY "Staff can manage vehicle insurance in their company" ON vehicle_insurance
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR (
            EXISTS (
                SELECT 1 FROM vehicles v 
                WHERE v.id = vehicle_insurance.vehicle_id 
                AND v.company_id = get_user_company(auth.uid())
            ) AND (
                has_role(auth.uid(), 'company_admin'::user_role) OR 
                has_role(auth.uid(), 'manager'::user_role)
            )
        )
    );

-- Create RLS policies for vehicle_maintenance
DROP POLICY IF EXISTS "Users can view vehicle maintenance in their company" ON vehicle_maintenance;
DROP POLICY IF EXISTS "Staff can manage vehicle maintenance in their company" ON vehicle_maintenance;

CREATE POLICY "Users can view vehicle maintenance in their company" ON vehicle_maintenance
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage vehicle maintenance in their company" ON vehicle_maintenance
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR (
            company_id = get_user_company(auth.uid()) AND (
                has_role(auth.uid(), 'company_admin'::user_role) OR 
                has_role(auth.uid(), 'manager'::user_role) OR 
                has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    );

-- Create RLS policies for vehicle_documents
DROP POLICY IF EXISTS "Users can view vehicle documents in their company" ON vehicle_documents;
DROP POLICY IF EXISTS "Staff can manage vehicle documents in their company" ON vehicle_documents;

CREATE POLICY "Users can view vehicle documents in their company" ON vehicle_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vehicles v 
            WHERE v.id = vehicle_documents.vehicle_id 
            AND v.company_id = get_user_company(auth.uid())
        )
    );

CREATE POLICY "Staff can manage vehicle documents in their company" ON vehicle_documents
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR (
            EXISTS (
                SELECT 1 FROM vehicles v 
                WHERE v.id = vehicle_documents.vehicle_id 
                AND v.company_id = get_user_company(auth.uid())
            ) AND (
                has_role(auth.uid(), 'company_admin'::user_role) OR 
                has_role(auth.uid(), 'manager'::user_role)
            )
        )
    );

-- Create RLS policies for maintenance_checklist
DROP POLICY IF EXISTS "Users can view maintenance checklist" ON maintenance_checklist;
DROP POLICY IF EXISTS "Staff can manage maintenance checklist" ON maintenance_checklist;

CREATE POLICY "Users can view maintenance checklist" ON maintenance_checklist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vehicle_maintenance vm 
            WHERE vm.id = maintenance_checklist.maintenance_id 
            AND vm.company_id = get_user_company(auth.uid())
        )
    );

CREATE POLICY "Staff can manage maintenance checklist" ON maintenance_checklist
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR (
            EXISTS (
                SELECT 1 FROM vehicle_maintenance vm 
                WHERE vm.id = maintenance_checklist.maintenance_id 
                AND vm.company_id = get_user_company(auth.uid())
            ) AND (
                has_role(auth.uid(), 'company_admin'::user_role) OR 
                has_role(auth.uid(), 'manager'::user_role) OR 
                has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_vehicle ON vehicle_pricing(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle ON vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_dates ON vehicle_insurance(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_status ON vehicle_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_company ON vehicle_maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_maintenance ON maintenance_checklist(maintenance_id);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_vehicle_pricing_updated_at ON vehicle_pricing;
DROP TRIGGER IF EXISTS update_vehicle_insurance_updated_at ON vehicle_insurance;
DROP TRIGGER IF EXISTS update_vehicle_maintenance_updated_at ON vehicle_maintenance;
DROP TRIGGER IF EXISTS update_vehicle_documents_updated_at ON vehicle_documents;

CREATE TRIGGER update_vehicle_pricing_updated_at BEFORE UPDATE ON vehicle_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_insurance_updated_at BEFORE UPDATE ON vehicle_insurance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_maintenance_updated_at BEFORE UPDATE ON vehicle_maintenance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_documents_updated_at BEFORE UPDATE ON vehicle_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update vehicle status based on maintenance
CREATE OR REPLACE FUNCTION update_vehicle_status_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vehicle status when maintenance starts
    IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
        UPDATE vehicles 
        SET status = 'under_maintenance', last_maintenance_date = NEW.started_date
        WHERE id = NEW.vehicle_id;
    END IF;
    
    -- Update vehicle status when maintenance completes
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE vehicles 
        SET status = 'available', 
            last_maintenance_date = NEW.completed_date,
            current_mileage = COALESCE(NEW.mileage_at_service, vehicles.current_mileage),
            last_service_mileage = COALESCE(NEW.mileage_at_service, vehicles.last_service_mileage)
        WHERE id = NEW.vehicle_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_vehicle_status_on_maintenance ON vehicle_maintenance;
CREATE TRIGGER trigger_update_vehicle_status_on_maintenance
    AFTER UPDATE ON vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_status_on_maintenance();

-- Function to generate maintenance numbers
CREATE OR REPLACE FUNCTION generate_maintenance_number(company_id_param uuid)
RETURNS text AS $$
DECLARE
    next_number integer;
    number_with_padding text;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(maintenance_number FROM '[0-9]+') AS integer)), 0) + 1
    INTO next_number
    FROM vehicle_maintenance
    WHERE company_id = company_id_param;
    
    number_with_padding := LPAD(next_number::text, 6, '0');
    
    RETURN 'MAINT-' || number_with_padding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;