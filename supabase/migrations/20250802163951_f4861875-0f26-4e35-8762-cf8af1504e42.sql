-- Phase 1: Fix Maintenance Integration
-- Add journal_entry_id to vehicle_maintenance table
ALTER TABLE public.vehicle_maintenance 
ADD COLUMN journal_entry_id UUID REFERENCES public.journal_entries(id);

-- Create index for better performance
CREATE INDEX idx_vehicle_maintenance_journal_entry ON public.vehicle_maintenance(journal_entry_id);

-- Add accumulated_depreciation to vehicles table if not exists
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC DEFAULT 0;

-- Update the calculate_vehicle_total_costs function to include fuel costs
CREATE OR REPLACE FUNCTION public.calculate_vehicle_total_costs(vehicle_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    maintenance_total NUMERIC;
    fuel_total NUMERIC;
    insurance_total NUMERIC;
    operating_total NUMERIC;
BEGIN
    -- حساب إجمالي تكاليف الصيانة
    SELECT COALESCE(SUM(actual_cost), 0) INTO maintenance_total
    FROM public.vehicle_maintenance
    WHERE vehicle_id = vehicle_id_param AND status = 'completed';
    
    -- حساب إجمالي تكاليف الوقود
    SELECT COALESCE(SUM(total_cost), 0) INTO fuel_total
    FROM public.fuel_records
    WHERE vehicle_id = vehicle_id_param;
    
    -- حساب إجمالي تكاليف التأمين (من المركبة نفسها)
    SELECT COALESCE(insurance_premium_amount, 0) INTO insurance_total
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    -- حساب إجمالي التكاليف التشغيلية
    operating_total := maintenance_total + fuel_total + insurance_total;
    
    -- تحديث المركبة بالتكاليف المحدثة
    UPDATE public.vehicles
    SET 
        total_maintenance_cost = maintenance_total,
        total_fuel_cost = fuel_total,
        total_insurance_cost = insurance_total,
        total_operating_cost = operating_total,
        updated_at = now()
    WHERE id = vehicle_id_param;
END;
$function$;

-- Create function to automatically create journal entries for maintenance
CREATE OR REPLACE FUNCTION public.create_maintenance_journal_entry(maintenance_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    maintenance_record RECORD;
    journal_entry_id uuid;
    maintenance_expense_account_id uuid;
    cash_account_id uuid;
    entry_number text;
    entry_count integer;
BEGIN
    -- Get maintenance details
    SELECT vm.*, v.vehicle_number, v.company_id 
    INTO maintenance_record
    FROM public.vehicle_maintenance vm
    JOIN public.vehicles v ON vm.vehicle_id = v.id
    WHERE vm.id = maintenance_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance record not found';
    END IF;
    
    -- Skip if no actual cost or already has journal entry
    IF maintenance_record.actual_cost IS NULL OR maintenance_record.actual_cost <= 0 OR maintenance_record.journal_entry_id IS NOT NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get maintenance expense account
    SELECT am.chart_of_accounts_id INTO maintenance_expense_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = maintenance_record.company_id
    AND dat.type_code = 'MAINTENANCE_EXPENSE'
    AND am.is_active = true
    LIMIT 1;
    
    -- Get cash account
    SELECT am.chart_of_accounts_id INTO cash_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = maintenance_record.company_id
    AND dat.type_code = 'CASH'
    AND am.is_active = true
    LIMIT 1;
    
    -- If accounts not found, try to find them by pattern
    IF maintenance_expense_account_id IS NULL THEN
        SELECT id INTO maintenance_expense_account_id
        FROM public.chart_of_accounts
        WHERE company_id = maintenance_record.company_id
        AND account_type = 'expenses'
        AND (account_name ILIKE '%maintenance%' OR account_name ILIKE '%صيانة%')
        AND is_active = true
        AND is_header = false
        LIMIT 1;
    END IF;
    
    IF cash_account_id IS NULL THEN
        SELECT id INTO cash_account_id
        FROM public.chart_of_accounts
        WHERE company_id = maintenance_record.company_id
        AND account_type = 'assets'
        AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%')
        AND is_active = true
        AND is_header = false
        LIMIT 1;
    END IF;
    
    -- Generate entry number
    SELECT COUNT(*) + 1 INTO entry_count
    FROM public.journal_entries
    WHERE company_id = maintenance_record.company_id
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    entry_number := 'JE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(entry_count::text, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        reference_number,
        total_amount,
        status,
        entry_type,
        created_by
    ) VALUES (
        maintenance_record.company_id,
        entry_number,
        CURRENT_DATE,
        'Vehicle Maintenance - ' || maintenance_record.vehicle_number || ' - ' || maintenance_record.maintenance_type,
        'MAINT-' || maintenance_record.maintenance_number,
        maintenance_record.actual_cost,
        'posted',
        'maintenance',
        maintenance_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    IF maintenance_expense_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            description,
            debit_amount,
            credit_amount
        ) VALUES (
            journal_entry_id,
            maintenance_expense_account_id,
            'Vehicle Maintenance Expense - ' || maintenance_record.vehicle_number,
            maintenance_record.actual_cost,
            0
        );
    END IF;
    
    IF cash_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            description,
            debit_amount,
            credit_amount
        ) VALUES (
            journal_entry_id,
            cash_account_id,
            'Cash payment for maintenance - ' || maintenance_record.vehicle_number,
            0,
            maintenance_record.actual_cost
        );
    END IF;
    
    -- Update maintenance record with journal entry ID
    UPDATE public.vehicle_maintenance
    SET journal_entry_id = journal_entry_id
    WHERE id = maintenance_id_param;
    
    -- Update vehicle costs
    PERFORM calculate_vehicle_total_costs(maintenance_record.vehicle_id);
    
    RETURN journal_entry_id;
END;
$function$;

-- Create trigger to automatically create journal entries when maintenance is completed
CREATE OR REPLACE FUNCTION public.trigger_maintenance_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Check if status changed to completed and there's an actual cost
    IF NEW.status = 'completed' AND 
       (OLD.status IS NULL OR OLD.status != 'completed') AND 
       NEW.actual_cost IS NOT NULL AND 
       NEW.actual_cost > 0 AND
       NEW.journal_entry_id IS NULL THEN
        
        -- Create journal entry in background
        PERFORM create_maintenance_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS maintenance_journal_entry_trigger ON public.vehicle_maintenance;
CREATE TRIGGER maintenance_journal_entry_trigger
    AFTER UPDATE ON public.vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION trigger_maintenance_journal_entry();

-- Create function for vehicle depreciation
CREATE OR REPLACE FUNCTION public.process_vehicle_depreciation_monthly(company_id_param uuid, depreciation_date_param date DEFAULT CURRENT_DATE)
RETURNS TABLE(
    vehicle_id uuid,
    vehicle_number text,
    monthly_depreciation numeric,
    accumulated_depreciation numeric,
    journal_entry_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_record RECORD;
    monthly_depreciation_amount NUMERIC;
    new_accumulated_depreciation NUMERIC;
    depreciation_expense_account_id uuid;
    accumulated_depreciation_account_id uuid;
    journal_entry_id uuid;
    entry_number text;
    entry_count integer;
BEGIN
    -- Get depreciation accounts
    SELECT am.chart_of_accounts_id INTO depreciation_expense_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = 'DEPRECIATION_EXPENSE'
    AND am.is_active = true
    LIMIT 1;
    
    SELECT am.chart_of_accounts_id INTO accumulated_depreciation_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = 'ACCUMULATED_DEPRECIATION'
    AND am.is_active = true
    LIMIT 1;
    
    -- Loop through vehicles
    FOR vehicle_record IN 
        SELECT * FROM public.vehicles 
        WHERE company_id = company_id_param 
        AND is_active = true 
        AND purchase_price > 0
        AND depreciation_rate > 0
    LOOP
        -- Calculate monthly depreciation
        monthly_depreciation_amount := (vehicle_record.purchase_price * vehicle_record.depreciation_rate / 100) / 12;
        new_accumulated_depreciation := COALESCE(vehicle_record.accumulated_depreciation, 0) + monthly_depreciation_amount;
        
        -- Don't depreciate beyond purchase price
        IF new_accumulated_depreciation > vehicle_record.purchase_price THEN
            monthly_depreciation_amount := vehicle_record.purchase_price - COALESCE(vehicle_record.accumulated_depreciation, 0);
            new_accumulated_depreciation := vehicle_record.purchase_price;
        END IF;
        
        -- Skip if no depreciation needed
        IF monthly_depreciation_amount <= 0 THEN
            CONTINUE;
        END IF;
        
        -- Generate entry number
        SELECT COUNT(*) + 1 INTO entry_count
        FROM public.journal_entries
        WHERE company_id = company_id_param
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM depreciation_date_param);
        
        entry_number := 'DEP-' || EXTRACT(YEAR FROM depreciation_date_param) || '-' || LPAD(entry_count::text, 4, '0');
        
        -- Create journal entry
        INSERT INTO public.journal_entries (
            company_id,
            entry_number,
            entry_date,
            description,
            total_amount,
            status,
            entry_type
        ) VALUES (
            company_id_param,
            entry_number,
            depreciation_date_param,
            'Monthly Vehicle Depreciation - ' || vehicle_record.vehicle_number,
            monthly_depreciation_amount,
            'posted',
            'depreciation'
        ) RETURNING id INTO journal_entry_id;
        
        -- Create journal entry lines
        IF depreciation_expense_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                journal_entry_id,
                account_id,
                description,
                debit_amount,
                credit_amount
            ) VALUES (
                journal_entry_id,
                depreciation_expense_account_id,
                'Depreciation Expense - ' || vehicle_record.vehicle_number,
                monthly_depreciation_amount,
                0
            );
        END IF;
        
        IF accumulated_depreciation_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                journal_entry_id,
                account_id,
                description,
                debit_amount,
                credit_amount
            ) VALUES (
                journal_entry_id,
                accumulated_depreciation_account_id,
                'Accumulated Depreciation - ' || vehicle_record.vehicle_number,
                0,
                monthly_depreciation_amount
            );
        END IF;
        
        -- Update vehicle depreciation
        UPDATE public.vehicles
        SET 
            accumulated_depreciation = new_accumulated_depreciation,
            updated_at = now()
        WHERE id = vehicle_record.id;
        
        -- Return results
        RETURN QUERY SELECT 
            vehicle_record.id,
            vehicle_record.vehicle_number,
            monthly_depreciation_amount,
            new_accumulated_depreciation,
            journal_entry_id;
    END LOOP;
END;
$function$;

-- Add default account types for vehicle operations
INSERT INTO public.default_account_types (type_code, type_name, type_name_ar, account_type, description)
VALUES 
    ('MAINTENANCE_EXPENSE', 'Vehicle Maintenance Expense', 'مصروفات صيانة المركبات', 'expenses', 'Account for vehicle maintenance costs'),
    ('FUEL_EXPENSE', 'Fuel Expense', 'مصروفات الوقود', 'expenses', 'Account for vehicle fuel costs'),
    ('DEPRECIATION_EXPENSE', 'Depreciation Expense', 'مصروفات الإهلاك', 'expenses', 'Account for vehicle depreciation expense'),
    ('ACCUMULATED_DEPRECIATION', 'Accumulated Depreciation', 'مجمع الإهلاك', 'assets', 'Contra asset account for accumulated depreciation')
ON CONFLICT (type_code) DO NOTHING;