-- Create default account types table
CREATE TABLE public.default_account_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name TEXT NOT NULL,
    type_name_ar TEXT,
    account_category TEXT NOT NULL, -- 'assets', 'liabilities', 'equity', 'revenue', 'expenses'
    description TEXT,
    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default account types that are commonly used in functions
INSERT INTO public.default_account_types (type_code, type_name, type_name_ar, account_category, description) VALUES
-- Asset accounts
('CASH', 'Cash', 'النقدية', 'assets', 'Cash and cash equivalents'),
('BANK', 'Bank Account', 'حساب بنكي', 'assets', 'Bank accounts'),
('RECEIVABLES', 'Accounts Receivable', 'الذمم المدينة', 'assets', 'Customer receivables'),
('VEHICLES', 'Vehicles', 'المركبات', 'assets', 'Vehicle assets'),
('EQUIPMENT', 'Equipment', 'المعدات', 'assets', 'Equipment and machinery'),
('ACCUMULATED_DEPRECIATION', 'Accumulated Depreciation', 'مجمع الإهلاك', 'assets', 'Accumulated depreciation'),

-- Liability accounts
('PAYABLES', 'Accounts Payable', 'الذمم الدائنة', 'liabilities', 'Vendor payables'),
('ACCRUED_EXPENSES', 'Accrued Expenses', 'المصروفات المستحقة', 'liabilities', 'Accrued expenses'),

-- Revenue accounts
('SALES_REVENUE', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', 'Sales and service revenue'),
('RENTAL_REVENUE', 'Rental Revenue', 'إيرادات الإيجار', 'revenue', 'Vehicle rental revenue'),

-- Expense accounts
('DEPRECIATION_EXPENSE', 'Depreciation Expense', 'مصروف الإهلاك', 'expenses', 'Depreciation expense'),
('MAINTENANCE_EXPENSE', 'Maintenance Expense', 'مصروف الصيانة', 'expenses', 'Vehicle maintenance expenses'),
('FUEL_EXPENSE', 'Fuel Expense', 'مصروف الوقود', 'expenses', 'Fuel expenses'),
('PENALTY_EXPENSE', 'Penalty Expense', 'مصروف المخالفات', 'expenses', 'Traffic violation penalties');

-- Create account mappings table
CREATE TABLE public.account_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    default_account_type_id UUID NOT NULL REFERENCES public.default_account_types(id) ON DELETE CASCADE,
    chart_of_accounts_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    mapped_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, default_account_type_id)
);

-- Enable RLS on new tables
ALTER TABLE public.default_account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for default_account_types (read-only for all authenticated users)
CREATE POLICY "Anyone can view default account types" 
ON public.default_account_types 
FOR SELECT 
TO authenticated
USING (true);

-- RLS policies for account_mappings
CREATE POLICY "Users can view mappings in their company" 
ON public.account_mappings 
FOR SELECT 
TO authenticated
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage mappings in their company" 
ON public.account_mappings 
FOR ALL 
TO authenticated
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
);

-- Add updated_at trigger for account_mappings
CREATE TRIGGER update_account_mappings_updated_at
    BEFORE UPDATE ON public.account_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get mapped account ID by type
CREATE OR REPLACE FUNCTION public.get_mapped_account_id(
    company_id_param UUID,
    account_type_code VARCHAR
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id UUID;
BEGIN
    -- Try to get mapped account first
    SELECT coa.id INTO account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    JOIN public.chart_of_accounts coa ON am.chart_of_accounts_id = coa.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = account_type_code
    AND am.is_active = true
    AND coa.is_active = true
    LIMIT 1;
    
    -- If no mapping found, try to find account by name patterns (fallback)
    IF account_id IS NULL THEN
        CASE account_type_code
            WHEN 'CASH' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'assets'
                AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقدية%')
                AND is_active = true
                LIMIT 1;
            
            WHEN 'BANK' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'assets'
                AND (account_name ILIKE '%bank%' OR account_name ILIKE '%بنك%')
                AND is_active = true
                LIMIT 1;
            
            WHEN 'RECEIVABLES' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'assets'
                AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
                AND is_active = true
                LIMIT 1;
            
            WHEN 'VEHICLES' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'assets'
                AND (account_name ILIKE '%vehicle%' OR account_name ILIKE '%equipment%' OR account_name ILIKE '%مركبة%')
                AND is_active = true
                LIMIT 1;
            
            WHEN 'SALES_REVENUE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'revenue'
                AND is_active = true
                LIMIT 1;
            
            WHEN 'DEPRECIATION_EXPENSE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'expenses'
                AND (account_name ILIKE '%depreciation%' OR account_name ILIKE '%إهلاك%')
                AND is_active = true
                LIMIT 1;
        END CASE;
    END IF;
    
    RETURN account_id;
END;
$$;