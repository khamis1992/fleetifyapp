-- Create maintenance account mappings for tracking maintenance expenses
CREATE TABLE IF NOT EXISTS public.maintenance_account_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    maintenance_type TEXT NOT NULL,
    expense_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    asset_account_id UUID REFERENCES public.chart_of_accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID
);

-- Add accounting integration columns to vehicle_maintenance table
ALTER TABLE public.vehicle_maintenance 
ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES public.chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS expense_recorded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id),
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_with_tax NUMERIC GENERATED ALWAYS AS (actual_cost + COALESCE(tax_amount, 0)) STORED;

-- Create maintenance expense journal entries automatically
CREATE OR REPLACE FUNCTION public.create_maintenance_expense_entry(
    maintenance_id_param UUID,
    company_id_param UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    maintenance_record RECORD;
    journal_entry_id UUID;
    expense_account_id UUID;
    cash_account_id UUID;
    entry_number TEXT;
    vehicle_name TEXT;
BEGIN
    -- Get maintenance details
    SELECT * INTO maintenance_record
    FROM public.vehicle_maintenance vm
    WHERE vm.id = maintenance_id_param
    AND vm.company_id = company_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance record not found';
    END IF;
    
    -- Get vehicle name for description
    SELECT COALESCE(make || ' ' || model || ' - ' || plate_number, 'Unknown Vehicle')
    INTO vehicle_name
    FROM public.vehicles
    WHERE id = maintenance_record.vehicle_id;
    
    -- Get expense account from mapping or use default
    SELECT mam.expense_account_id INTO expense_account_id
    FROM public.maintenance_account_mappings mam
    WHERE mam.company_id = company_id_param
    AND mam.maintenance_type = maintenance_record.maintenance_type
    AND mam.is_active = true
    LIMIT 1;
    
    -- If no mapping found, try to find a general maintenance expense account
    IF expense_account_id IS NULL THEN
        SELECT id INTO expense_account_id
        FROM public.chart_of_accounts
        WHERE company_id = company_id_param
        AND account_type = 'expense'
        AND (account_name ILIKE '%maintenance%' OR account_name ILIKE '%صيانة%')
        AND is_active = true
        AND is_header = false
        ORDER BY account_code
        LIMIT 1;
    END IF;
    
    -- Get cash account
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%' OR account_name ILIKE '%نقد%')
    AND is_active = true
    AND is_header = false
    ORDER BY account_code
    LIMIT 1;
    
    IF expense_account_id IS NULL OR cash_account_id IS NULL THEN
        RAISE EXCEPTION 'Required accounts not found for maintenance expense entry';
    END IF;
    
    -- Generate entry number
    entry_number := 'MAINT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = company_id_param 
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND entry_number LIKE 'MAINT-%'
    )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_amount,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        entry_number,
        CURRENT_DATE,
        'Vehicle Maintenance Expense - ' || vehicle_name || ' (' || maintenance_record.maintenance_type || ')',
        'maintenance',
        maintenance_id_param,
        maintenance_record.actual_cost + COALESCE(maintenance_record.tax_amount, 0),
        'posted',
        auth.uid()
    ) RETURNING id INTO journal_entry_id;
    
    -- Create expense entry (debit)
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        journal_entry_id,
        expense_account_id,
        'Maintenance expense for ' || vehicle_name,
        maintenance_record.actual_cost + COALESCE(maintenance_record.tax_amount, 0),
        0
    );
    
    -- Create cash/payment entry (credit)
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        journal_entry_id,
        cash_account_id,
        'Payment for maintenance - ' || vehicle_name,
        0,
        maintenance_record.actual_cost + COALESCE(maintenance_record.tax_amount, 0)
    );
    
    -- Update maintenance record
    UPDATE public.vehicle_maintenance
    SET 
        journal_entry_id = journal_entry_id,
        expense_account_id = expense_account_id,
        expense_recorded = true,
        updated_at = now()
    WHERE id = maintenance_id_param;
    
    RETURN journal_entry_id;
END;
$$;

-- RLS policies for maintenance account mappings
ALTER TABLE public.maintenance_account_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance mappings in their company"
ON public.maintenance_account_mappings FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage maintenance mappings in their company"
ON public.maintenance_account_mappings FOR ALL
USING (
    has_role(auth.uid(), 'super_admin') OR 
    (
        company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'manager'))
    )
);

-- Trigger to automatically create expense entries when maintenance is completed
CREATE OR REPLACE FUNCTION public.trigger_maintenance_expense_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only create expense entry when status changes to completed and actual_cost > 0
    IF OLD.status != NEW.status 
       AND NEW.status = 'completed' 
       AND NEW.actual_cost > 0 
       AND NEW.expense_recorded = false THEN
        
        -- Create the expense entry
        PERFORM public.create_maintenance_expense_entry(NEW.id, NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_maintenance_expense
    AFTER UPDATE ON public.vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_maintenance_expense_entry();

-- Create maintenance cost summary view
CREATE OR REPLACE VIEW public.maintenance_cost_summary AS
SELECT 
    vm.company_id,
    vm.vehicle_id,
    v.make,
    v.model,
    v.plate_number,
    COUNT(*) as total_maintenance_count,
    COUNT(*) FILTER (WHERE vm.status = 'completed') as completed_maintenance_count,
    COALESCE(SUM(vm.actual_cost), 0) as total_maintenance_cost,
    COALESCE(SUM(vm.tax_amount), 0) as total_tax_amount,
    COALESCE(SUM(vm.actual_cost + COALESCE(vm.tax_amount, 0)), 0) as total_cost_with_tax,
    COALESCE(AVG(vm.actual_cost), 0) as average_maintenance_cost,
    MAX(vm.completed_date) as last_maintenance_date
FROM public.vehicle_maintenance vm
JOIN public.vehicles v ON vm.vehicle_id = v.id
WHERE vm.status = 'completed'
GROUP BY vm.company_id, vm.vehicle_id, v.make, v.model, v.plate_number;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_account_mappings_company_type 
ON public.maintenance_account_mappings(company_id, maintenance_type);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_accounting 
ON public.vehicle_maintenance(company_id, status, expense_recorded);