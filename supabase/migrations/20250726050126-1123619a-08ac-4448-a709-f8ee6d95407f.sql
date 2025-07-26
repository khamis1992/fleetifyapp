-- Create function to automatically record maintenance expenses with proper accounting integration
CREATE OR REPLACE FUNCTION public.create_maintenance_journal_entry(maintenance_id_param uuid)
RETURNS uuid AS $$
DECLARE
    maintenance_record record;
    journal_entry_id uuid;
    expense_account_id uuid;
    cash_account_id uuid;
    maintenance_cost_center_id uuid;
BEGIN
    -- Get maintenance details
    SELECT vm.*, v.plate_number, v.company_id 
    INTO maintenance_record
    FROM public.vehicle_maintenance vm
    JOIN public.vehicles v ON vm.vehicle_id = v.id
    WHERE vm.id = maintenance_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle maintenance record not found';
    END IF;
    
    -- Skip if no cost or already has journal entry
    IF maintenance_record.actual_cost IS NULL OR maintenance_record.actual_cost <= 0 OR maintenance_record.journal_entry_id IS NOT NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get maintenance cost center
    SELECT id INTO maintenance_cost_center_id
    FROM public.cost_centers
    WHERE company_id = maintenance_record.company_id
    AND center_code = 'MAINTENANCE_OPS'
    AND is_active = true
    LIMIT 1;
    
    -- Fallback to general maintenance cost center
    IF maintenance_cost_center_id IS NULL THEN
        SELECT id INTO maintenance_cost_center_id
        FROM public.cost_centers
        WHERE company_id = maintenance_record.company_id
        AND (center_code = 'MAINTENANCE' OR center_name ILIKE '%maintenance%')
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Get expense account for maintenance
    SELECT id INTO expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = maintenance_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%maintenance%' OR account_name ILIKE '%repair%' OR account_name ILIKE '%vehicle%expense%')
    AND is_active = true
    LIMIT 1;
    
    -- Fallback to general expenses
    IF expense_account_id IS NULL THEN
        SELECT id INTO expense_account_id
        FROM public.chart_of_accounts
        WHERE company_id = maintenance_record.company_id
        AND account_type = 'expenses'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Get cash/bank account
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = maintenance_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status
    ) VALUES (
        gen_random_uuid(),
        maintenance_record.company_id,
        generate_journal_entry_number(maintenance_record.company_id),
        COALESCE(maintenance_record.completed_date, maintenance_record.scheduled_date),
        'Vehicle Maintenance - ' || maintenance_record.plate_number || ' - ' || maintenance_record.maintenance_type,
        'vehicle_maintenance',
        maintenance_record.id,
        maintenance_record.actual_cost,
        maintenance_record.actual_cost,
        'draft'
    ) RETURNING id INTO journal_entry_id;
    
    -- Debit: Maintenance expense
    IF expense_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            expense_account_id,
            maintenance_cost_center_id,
            1,
            'Vehicle Maintenance Expense - ' || maintenance_record.plate_number,
            maintenance_record.actual_cost,
            0
        );
    END IF;
    
    -- Credit: Cash/Bank
    IF cash_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
            maintenance_cost_center_id,
            2,
            'Cash Payment - Vehicle Maintenance',
            0,
            maintenance_record.actual_cost
        );
    END IF;
    
    -- Update maintenance record with journal entry reference
    UPDATE public.vehicle_maintenance
    SET journal_entry_id = journal_entry_id
    WHERE id = maintenance_id_param;
    
    RETURN journal_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for maintenance expense accounting
CREATE OR REPLACE FUNCTION public.handle_maintenance_accounting()
RETURNS TRIGGER AS $$
BEGIN
    -- Create journal entry when maintenance is completed and has actual cost
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.actual_cost > 0 AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := public.create_maintenance_journal_entry(NEW.id);
    ELSIF (TG_OP = 'UPDATE' AND OLD.actual_cost IS DISTINCT FROM NEW.actual_cost AND NEW.status = 'completed' AND NEW.actual_cost > 0 AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := public.create_maintenance_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_maintenance_accounting ON public.vehicle_maintenance;
CREATE TRIGGER trigger_maintenance_accounting
    BEFORE UPDATE ON public.vehicle_maintenance
    FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_accounting();

-- Update the cost center selection for maintenance to use maintenance operations
CREATE OR REPLACE FUNCTION public.get_maintenance_cost_center(company_id_param uuid)
RETURNS uuid AS $$
DECLARE
    cost_center_id uuid;
BEGIN
    -- Try to get maintenance operations cost center
    SELECT id INTO cost_center_id
    FROM public.cost_centers
    WHERE company_id = company_id_param
    AND center_code = 'MAINTENANCE_OPS'
    AND is_active = true
    LIMIT 1;
    
    -- Fallback to maintenance center
    IF cost_center_id IS NULL THEN
        SELECT id INTO cost_center_id
        FROM public.cost_centers
        WHERE company_id = company_id_param
        AND (center_code = 'MAINTENANCE' OR center_name ILIKE '%maintenance%')
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Final fallback to admin center
    IF cost_center_id IS NULL THEN
        SELECT id INTO cost_center_id
        FROM public.cost_centers
        WHERE company_id = company_id_param
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN cost_center_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';