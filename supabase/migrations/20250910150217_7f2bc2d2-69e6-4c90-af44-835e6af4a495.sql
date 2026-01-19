-- Create properties tables and update companies table for modular system

-- First, update companies table with modular system fields
DO $$ BEGIN
    -- Add modular system columns to companies table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'active_modules') THEN
        ALTER TABLE public.companies ADD COLUMN active_modules text[] DEFAULT ARRAY['core', 'finance', 'vehicles', 'contracts', 'customers'];
    END IF;
    
    -- Update existing companies to have the car rental business type
    UPDATE public.companies 
    SET business_type = 'car_rental',
        active_modules = ARRAY['core', 'finance', 'vehicles', 'contracts', 'customers']
    WHERE business_type IS NULL OR active_modules IS NULL;
END $$;

-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    property_code text NOT NULL,
    property_name text NOT NULL,
    property_name_ar text,
    property_type text NOT NULL DEFAULT 'apartment', -- apartment, villa, office, shop, warehouse, land
    property_status text NOT NULL DEFAULT 'available', -- available, rented, sold, maintenance
    address text,
    address_ar text,
    area_sqm numeric,
    bedrooms integer,
    bathrooms integer,
    parking_spaces integer,
    floor_number integer,
    total_floors integer,
    furnished boolean DEFAULT false,
    rental_price numeric,
    sale_price numeric,
    currency text DEFAULT 'KWD',
    description text,
    description_ar text,
    features jsonb DEFAULT '{}',
    location_coordinates jsonb, -- {lat, lng}
    images text[] DEFAULT '{}',
    documents text[] DEFAULT '{}',
    owner_id uuid,
    manager_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    
    CONSTRAINT unique_property_code_per_company UNIQUE (company_id, property_code),
    CONSTRAINT valid_property_type CHECK (property_type IN ('apartment', 'villa', 'office', 'shop', 'warehouse', 'land')),
    CONSTRAINT valid_property_status CHECK (property_status IN ('available', 'rented', 'sold', 'maintenance'))
);

-- Create property owners table
CREATE TABLE IF NOT EXISTS public.property_owners (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    owner_code text NOT NULL,
    full_name text NOT NULL,
    full_name_ar text,
    phone text,
    email text,
    civil_id text,
    nationality text,
    address text,
    address_ar text,
    bank_account_info jsonb DEFAULT '{}',
    commission_percentage numeric DEFAULT 0,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    
    CONSTRAINT unique_owner_code_per_company UNIQUE (company_id, owner_code)
);

-- Create property contracts table
CREATE TABLE IF NOT EXISTS public.property_contracts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id uuid, -- Reference to customers table
    contract_number text NOT NULL,
    contract_type text NOT NULL DEFAULT 'rental', -- rental, sale
    start_date date NOT NULL,
    end_date date,
    rental_amount numeric,
    deposit_amount numeric DEFAULT 0,
    commission_amount numeric DEFAULT 0,
    payment_frequency text DEFAULT 'monthly', -- monthly, quarterly, annually
    payment_day integer DEFAULT 1, -- Day of month for payment
    currency text DEFAULT 'KWD',
    terms text,
    terms_ar text,
    status text DEFAULT 'draft', -- draft, active, expired, cancelled
    auto_renewal boolean DEFAULT false,
    renewal_period integer, -- months
    late_fee_rate numeric DEFAULT 0,
    grace_period_days integer DEFAULT 0,
    security_deposit numeric DEFAULT 0,
    utilities_included boolean DEFAULT false,
    maintenance_responsibility text DEFAULT 'owner', -- owner, tenant, shared
    insurance_required boolean DEFAULT false,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    
    CONSTRAINT unique_contract_number_per_company UNIQUE (company_id, contract_number),
    CONSTRAINT valid_contract_type CHECK (contract_type IN ('rental', 'sale')),
    CONSTRAINT valid_contract_status CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
    CONSTRAINT valid_payment_frequency CHECK (payment_frequency IN ('monthly', 'quarterly', 'annually')),
    CONSTRAINT valid_maintenance_responsibility CHECK (maintenance_responsibility IN ('owner', 'tenant', 'shared'))
);

-- Create property payments table
CREATE TABLE IF NOT EXISTS public.property_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    property_contract_id uuid NOT NULL REFERENCES public.property_contracts(id) ON DELETE CASCADE,
    payment_number text NOT NULL,
    payment_type text NOT NULL DEFAULT 'rent', -- rent, deposit, commission, late_fee, utilities
    due_date date NOT NULL,
    payment_date date,
    amount numeric NOT NULL,
    late_fee numeric DEFAULT 0,
    total_amount numeric GENERATED ALWAYS AS (amount + COALESCE(late_fee, 0)) STORED,
    currency text DEFAULT 'KWD',
    payment_method text, -- cash, check, bank_transfer, card
    reference_number text,
    status text DEFAULT 'pending', -- pending, paid, overdue, cancelled
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    
    CONSTRAINT unique_payment_number_per_company UNIQUE (company_id, payment_number),
    CONSTRAINT valid_payment_type CHECK (payment_type IN ('rent', 'deposit', 'commission', 'late_fee', 'utilities')),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'))
);

-- Add foreign key to properties table for owner
ALTER TABLE public.properties ADD CONSTRAINT fk_properties_owner 
FOREIGN KEY (owner_id) REFERENCES public.property_owners(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(property_status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_property_owners_company_id ON public.property_owners(company_id);
CREATE INDEX IF NOT EXISTS idx_property_contracts_company_id ON public.property_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_property_contracts_property_id ON public.property_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_contracts_status ON public.property_contracts(status);
CREATE INDEX IF NOT EXISTS idx_property_payments_company_id ON public.property_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_property_payments_contract_id ON public.property_payments(property_contract_id);
CREATE INDEX IF NOT EXISTS idx_property_payments_due_date ON public.property_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_property_payments_status ON public.property_payments(status);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for properties
CREATE POLICY "Users can view properties in their company" ON public.properties
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage properties in their company" ON public.properties
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR 
          has_role(auth.uid(), 'manager'::user_role) OR 
          has_role(auth.uid(), 'sales_agent'::user_role)))
    );

-- Create RLS policies for property owners
CREATE POLICY "Users can view property owners in their company" ON public.property_owners
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage property owners in their company" ON public.property_owners
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR 
          has_role(auth.uid(), 'manager'::user_role)))
    );

-- Create RLS policies for property contracts
CREATE POLICY "Users can view property contracts in their company" ON public.property_contracts
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage property contracts in their company" ON public.property_contracts
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR 
          has_role(auth.uid(), 'manager'::user_role) OR 
          has_role(auth.uid(), 'sales_agent'::user_role)))
    );

-- Create RLS policies for property payments
CREATE POLICY "Users can view property payments in their company" ON public.property_payments
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage property payments in their company" ON public.property_payments
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR 
          has_role(auth.uid(), 'manager'::user_role) OR 
          has_role(auth.uid(), 'sales_agent'::user_role)))
    );

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_owners_updated_at BEFORE UPDATE ON public.property_owners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_contracts_updated_at BEFORE UPDATE ON public.property_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_payments_updated_at BEFORE UPDATE ON public.property_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();