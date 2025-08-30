-- Add default account types for vehicle operations (corrected)
INSERT INTO public.default_account_types (type_code, type_name, type_name_ar, account_category, description)
VALUES 
    ('MAINTENANCE_EXPENSE', 'Vehicle Maintenance Expense', 'مصروفات صيانة المركبات', 'expenses', 'Account for vehicle maintenance costs'),
    ('FUEL_EXPENSE', 'Fuel Expense', 'مصروفات الوقود', 'expenses', 'Account for vehicle fuel costs'),
    ('DEPRECIATION_EXPENSE', 'Depreciation Expense', 'مصروفات الإهلاك', 'expenses', 'Account for vehicle depreciation expense'),
    ('ACCUMULATED_DEPRECIATION', 'Accumulated Depreciation', 'مجمع الإهلاك', 'assets', 'Contra asset account for accumulated depreciation')
ON CONFLICT (type_code) DO NOTHING;

-- Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS public.process_vehicle_depreciation_monthly(uuid, date);

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