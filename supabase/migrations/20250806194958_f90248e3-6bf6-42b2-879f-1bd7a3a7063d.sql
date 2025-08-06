-- Create essential account mappings table
CREATE TABLE public.essential_account_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    account_type TEXT NOT NULL, -- 'RECEIVABLES', 'PAYABLES', 'CASH', 'REVENUE', 'EXPENSES', etc.
    account_id UUID,
    is_configured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    CONSTRAINT fk_essential_mappings_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_essential_mappings_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    UNIQUE(company_id, account_type)
);

-- Enable RLS
ALTER TABLE public.essential_account_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage essential mappings in their company" 
ON public.essential_account_mappings 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "Users can view essential mappings in their company" 
ON public.essential_account_mappings 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create function to ensure essential account mappings exist
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    essential_types TEXT[] := ARRAY[
        'RECEIVABLES', 'PAYABLES', 'CASH', 'BANK', 'REVENUE', 'EXPENSES', 
        'VEHICLE_EXPENSES', 'FUEL_EXPENSES', 'MAINTENANCE_EXPENSES',
        'EMPLOYEE_EXPENSES', 'LEGAL_EXPENSES', 'CONTRACT_REVENUE'
    ];
    type_name TEXT;
    existing_account_id UUID;
    auto_account_id UUID;
    created_mappings TEXT[] := '{}';
    existing_mappings TEXT[] := '{}';
    error_mappings TEXT[] := '{}';
    account_name TEXT;
    account_code TEXT;
    result JSONB;
BEGIN
    -- Check if company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = company_id_param) THEN
        RAISE EXCEPTION 'Company not found';
    END IF;

    FOREACH type_name IN ARRAY essential_types
    LOOP
        -- Check if mapping already exists
        SELECT account_id INTO existing_account_id
        FROM essential_account_mappings 
        WHERE company_id = company_id_param AND account_type = type_name;
        
        IF existing_account_id IS NOT NULL THEN
            -- Mapping exists, add to existing list
            existing_mappings := array_append(existing_mappings, type_name);
        ELSE
            -- Try to find suitable account automatically
            CASE type_name
                WHEN 'RECEIVABLES' THEN
                    SELECT id, account_name, account_code INTO auto_account_id, account_name, account_code
                    FROM chart_of_accounts 
                    WHERE company_id = company_id_param 
                    AND account_type = 'assets' 
                    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_code LIKE '112%')
                    AND is_active = true AND is_header = false
                    LIMIT 1;
                    
                WHEN 'PAYABLES' THEN
                    SELECT id, account_name, account_code INTO auto_account_id, account_name, account_code
                    FROM chart_of_accounts 
                    WHERE company_id = company_id_param 
                    AND account_type = 'liabilities' 
                    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%دائن%' OR account_code LIKE '211%')
                    AND is_active = true AND is_header = false
                    LIMIT 1;
                    
                WHEN 'CASH' THEN
                    SELECT id, account_name, account_code INTO auto_account_id, account_name, account_code
                    FROM chart_of_accounts 
                    WHERE company_id = company_id_param 
                    AND account_type = 'assets' 
                    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%' OR account_code LIKE '101%')
                    AND is_active = true AND is_header = false
                    LIMIT 1;
                    
                WHEN 'BANK' THEN
                    SELECT id, account_name, account_code INTO auto_account_id, account_name, account_code
                    FROM chart_of_accounts 
                    WHERE company_id = company_id_param 
                    AND account_type = 'assets' 
                    AND (account_name ILIKE '%bank%' OR account_name ILIKE '%بنك%' OR account_code LIKE '102%')
                    AND is_active = true AND is_header = false
                    LIMIT 1;
                    
                WHEN 'REVENUE' THEN
                    SELECT id, account_name, account_code INTO auto_account_id, account_name, account_code
                    FROM chart_of_accounts 
                    WHERE company_id = company_id_param 
                    AND account_type = 'revenue' 
                    AND (account_name ILIKE '%revenue%' OR account_name ILIKE '%إيراد%' OR account_code LIKE '4%')
                    AND is_active = true AND is_header = false
                    LIMIT 1;
                    
                WHEN 'EXPENSES' THEN
                    SELECT id, account_name, account_code INTO auto_account_id, account_name, account_code
                    FROM chart_of_accounts 
                    WHERE company_id = company_id_param 
                    AND account_type = 'expenses' 
                    AND (account_name ILIKE '%expense%' OR account_name ILIKE '%مصروف%' OR account_code LIKE '5%')
                    AND is_active = true AND is_header = false
                    LIMIT 1;
                    
                ELSE
                    auto_account_id := NULL;
            END CASE;
            
            IF auto_account_id IS NOT NULL THEN
                -- Create the mapping
                INSERT INTO essential_account_mappings (
                    company_id, account_type, account_id, is_configured, created_by
                ) VALUES (
                    company_id_param, type_name, auto_account_id, true, auth.uid()
                );
                created_mappings := array_append(created_mappings, type_name);
            ELSE
                -- Could not auto-configure
                INSERT INTO essential_account_mappings (
                    company_id, account_type, account_id, is_configured, created_by
                ) VALUES (
                    company_id_param, type_name, NULL, false, auth.uid()
                );
                error_mappings := array_append(error_mappings, type_name);
            END IF;
        END IF;
    END LOOP;
    
    -- Return results
    result := jsonb_build_object(
        'created', created_mappings,
        'existing', existing_mappings,
        'errors', error_mappings
    );
    
    RETURN result;
END;
$$;