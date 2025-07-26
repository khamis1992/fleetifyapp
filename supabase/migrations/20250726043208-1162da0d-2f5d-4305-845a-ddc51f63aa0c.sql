-- Fix security warnings for fleet management functions

-- Update the search_path for the functions to meet security requirements
CREATE OR REPLACE FUNCTION update_vehicle_status_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vehicle status when maintenance starts
    IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
        UPDATE public.vehicles 
        SET status = 'under_maintenance', last_maintenance_date = NEW.started_date
        WHERE id = NEW.vehicle_id;
    END IF;
    
    -- Update vehicle status when maintenance completes
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.vehicles 
        SET status = 'available', 
            last_maintenance_date = NEW.completed_date,
            current_mileage = COALESCE(NEW.mileage_at_service, vehicles.current_mileage),
            last_service_mileage = COALESCE(NEW.mileage_at_service, vehicles.last_service_mileage)
        WHERE id = NEW.vehicle_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update the maintenance number generation function
CREATE OR REPLACE FUNCTION generate_maintenance_number(company_id_param uuid)
RETURNS text AS $$
DECLARE
    next_number integer;
    number_with_padding text;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(maintenance_number FROM '[0-9]+') AS integer)), 0) + 1
    INTO next_number
    FROM public.vehicle_maintenance
    WHERE company_id = company_id_param;
    
    number_with_padding := LPAD(next_number::text, 6, '0');
    
    RETURN 'MAINT-' || number_with_padding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to create maintenance journal entries for financial integration
CREATE OR REPLACE FUNCTION create_maintenance_journal_entry(maintenance_id_param uuid)
RETURNS uuid AS $$
DECLARE
    maintenance_record record;
    journal_entry_id uuid;
    expense_account_id uuid;
    cash_account_id uuid;
    maintenance_cost_center_id uuid;
BEGIN
    -- Get maintenance details
    SELECT * INTO maintenance_record
    FROM public.vehicle_maintenance
    WHERE id = maintenance_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance record not found';
    END IF;
    
    -- Get maintenance cost center
    SELECT id INTO maintenance_cost_center_id
    FROM public.cost_centers
    WHERE company_id = maintenance_record.company_id
    AND center_code = 'MAINTENANCE_OPS'
    AND is_active = true
    LIMIT 1;
    
    -- Find required accounts
    SELECT id INTO expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = maintenance_record.company_id
    AND account_type = 'expenses'
    AND is_active = true
    LIMIT 1;
    
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
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        maintenance_record.company_id,
        generate_journal_entry_number(maintenance_record.company_id),
        maintenance_record.completed_date,
        'Vehicle Maintenance #' || maintenance_record.maintenance_number,
        'maintenance',
        maintenance_record.id,
        maintenance_record.actual_cost,
        maintenance_record.actual_cost,
        'draft',
        maintenance_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
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
            'Maintenance Expense - ' || maintenance_record.maintenance_number,
            maintenance_record.actual_cost,
            0
        );
    END IF;
    
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
            'Cash Payment - ' || maintenance_record.maintenance_number,
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

-- Function to automatically create fixed asset when vehicle is added
CREATE OR REPLACE FUNCTION create_vehicle_fixed_asset()
RETURNS TRIGGER AS $$
DECLARE
    asset_id uuid;
    maintenance_cost_center_id uuid;
    calculated_book_value numeric;
BEGIN
    -- Only create fixed asset if purchase information is provided
    IF NEW.purchase_cost IS NOT NULL AND NEW.purchase_date IS NOT NULL THEN
        -- Get maintenance cost center
        SELECT id INTO maintenance_cost_center_id
        FROM public.cost_centers
        WHERE company_id = NEW.company_id
        AND center_code = 'MAINTENANCE_OPS'
        AND is_active = true
        LIMIT 1;
        
        -- Calculate book value
        calculated_book_value := NEW.purchase_cost - COALESCE(NEW.accumulated_depreciation, 0);
        
        -- Create fixed asset record
        INSERT INTO public.fixed_assets (
            id,
            company_id,
            asset_code,
            asset_name,
            asset_name_ar,
            category,
            purchase_date,
            purchase_cost,
            useful_life_years,
            salvage_value,
            accumulated_depreciation,
            book_value,
            location,
            condition_status,
            notes,
            is_active
        ) VALUES (
            gen_random_uuid(),
            NEW.company_id,
            'VEH-' || NEW.license_plate,
            NEW.make || ' ' || NEW.model || ' (' || NEW.year || ')',
            NEW.make || ' ' || NEW.model || ' (' || NEW.year || ')',
            'Vehicle',
            NEW.purchase_date,
            NEW.purchase_cost,
            COALESCE(NEW.useful_life_years, 10),
            COALESCE(NEW.residual_value, 0),
            COALESCE(NEW.accumulated_depreciation, 0),
            calculated_book_value,
            'Fleet',
            'good',
            'Auto-created from vehicle: ' || NEW.license_plate,
            true
        ) RETURNING id INTO asset_id;
        
        -- Update vehicle with fixed asset reference and cost center
        NEW.fixed_asset_id := asset_id;
        NEW.cost_center_id := maintenance_cost_center_id;
        NEW.book_value := calculated_book_value;
        
        -- Calculate annual depreciation rate if not set
        IF NEW.annual_depreciation_rate IS NULL AND NEW.useful_life_years > 0 THEN
            NEW.annual_depreciation_rate := (NEW.purchase_cost - COALESCE(NEW.residual_value, 0)) / NEW.useful_life_years;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for automatic fixed asset creation
DROP TRIGGER IF EXISTS trigger_create_vehicle_fixed_asset ON vehicles;
CREATE TRIGGER trigger_create_vehicle_fixed_asset
    BEFORE INSERT OR UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION create_vehicle_fixed_asset();