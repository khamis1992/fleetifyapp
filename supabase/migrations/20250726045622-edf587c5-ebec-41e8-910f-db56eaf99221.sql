-- Fix security issues by setting search_path for functions

-- Update vehicle status function with search_path
CREATE OR REPLACE FUNCTION public.update_vehicle_status_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vehicle status when maintenance starts
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        IF NEW.status = 'in_progress' THEN
            UPDATE public.vehicles 
            SET status = 'maintenance', updated_at = now()
            WHERE id = NEW.vehicle_id;
        ELSIF NEW.status = 'completed' THEN
            UPDATE public.vehicles 
            SET status = 'available', updated_at = now()
            WHERE id = NEW.vehicle_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update fixed asset creation function with search_path
CREATE OR REPLACE FUNCTION public.create_vehicle_fixed_asset()
RETURNS TRIGGER AS $$
DECLARE
    asset_account_id uuid;
    depreciation_account_id uuid;
    new_asset_id uuid;
BEGIN
    -- Get asset account
    SELECT id INTO asset_account_id
    FROM public.chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%vehicle%' OR account_name ILIKE '%equipment%')
    AND is_active = true
    LIMIT 1;
    
    -- Get depreciation account
    SELECT id INTO depreciation_account_id
    FROM public.chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_type = 'expenses'
    AND account_name ILIKE '%depreciation%'
    AND is_active = true
    LIMIT 1;
    
    -- Create fixed asset record
    INSERT INTO public.fixed_assets (
        id,
        company_id,
        asset_code,
        asset_name,
        asset_name_ar,
        category,
        purchase_cost,
        purchase_date,
        useful_life_years,
        depreciation_method,
        location,
        serial_number,
        condition_status,
        asset_account_id,
        depreciation_account_id,
        book_value,
        notes
    ) VALUES (
        gen_random_uuid(),
        NEW.company_id,
        NEW.plate_number,
        NEW.make || ' ' || NEW.model || ' (' || NEW.year || ')',
        COALESCE(NEW.make_ar, NEW.make) || ' ' || COALESCE(NEW.model_ar, NEW.model) || ' (' || NEW.year || ')',
        'Vehicle',
        COALESCE(NEW.purchase_price, 0),
        COALESCE(NEW.purchase_date, NEW.created_at::date),
        COALESCE(NEW.useful_life_years, 5),
        'straight_line',
        NEW.current_location,
        NEW.vin_number,
        NEW.condition_status::text,
        asset_account_id,
        depreciation_account_id,
        COALESCE(NEW.purchase_price, 0),
        'Automatically created from vehicle: ' || NEW.plate_number
    ) RETURNING id INTO new_asset_id;
    
    -- Update vehicle with fixed asset reference
    UPDATE public.vehicles
    SET fixed_asset_id = new_asset_id
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update vehicle depreciation function with search_path
CREATE OR REPLACE FUNCTION public.process_vehicle_depreciation(company_id_param uuid, depreciation_date_param date DEFAULT CURRENT_DATE)
RETURNS integer AS $$
DECLARE
    vehicle_record record;
    monthly_depreciation numeric;
    processed_count integer := 0;
    journal_entry_id uuid;
BEGIN
    -- Process depreciation for all vehicles with fixed assets
    FOR vehicle_record IN 
        SELECT v.*, fa.id as asset_id, fa.purchase_cost, fa.useful_life_years, fa.accumulated_depreciation, fa.salvage_value
        FROM public.vehicles v
        JOIN public.fixed_assets fa ON v.fixed_asset_id = fa.id
        WHERE v.company_id = company_id_param 
        AND v.is_active = true
        AND fa.is_active = true
        AND fa.disposal_date IS NULL
        AND fa.useful_life_years > 0
    LOOP
        -- Calculate monthly depreciation
        monthly_depreciation := (vehicle_record.purchase_cost - COALESCE(vehicle_record.salvage_value, 0)) / (vehicle_record.useful_life_years * 12);
        
        -- Skip if amount is negligible
        IF monthly_depreciation < 0.01 THEN
            CONTINUE;
        END IF;
        
        -- Check if already processed for this period
        IF EXISTS (
            SELECT 1 FROM public.depreciation_records 
            WHERE fixed_asset_id = vehicle_record.asset_id 
            AND depreciation_date = depreciation_date_param
        ) THEN
            CONTINUE;
        END IF;
        
        -- Create depreciation journal entry
        journal_entry_id := public.create_depreciation_journal_entry(
            vehicle_record.asset_id, 
            monthly_depreciation, 
            depreciation_date_param
        );
        
        -- Create depreciation record
        INSERT INTO public.depreciation_records (
            id,
            fixed_asset_id,
            depreciation_amount,
            depreciation_date,
            accumulated_depreciation,
            book_value,
            journal_entry_id,
            period_type,
            notes
        ) VALUES (
            gen_random_uuid(),
            vehicle_record.asset_id,
            monthly_depreciation,
            depreciation_date_param,
            COALESCE(vehicle_record.accumulated_depreciation, 0) + monthly_depreciation,
            vehicle_record.purchase_cost - (COALESCE(vehicle_record.accumulated_depreciation, 0) + monthly_depreciation),
            journal_entry_id,
            'monthly',
            'Vehicle depreciation: ' || vehicle_record.plate_number
        );
        
        -- Update fixed asset
        UPDATE public.fixed_assets
        SET accumulated_depreciation = COALESCE(accumulated_depreciation, 0) + monthly_depreciation,
            book_value = purchase_cost - (COALESCE(accumulated_depreciation, 0) + monthly_depreciation),
            updated_at = now()
        WHERE id = vehicle_record.asset_id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update available vehicles function with search_path
CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid)
RETURNS TABLE (
    id uuid,
    plate_number text,
    make text,
    model text,
    year integer,
    status text,
    daily_rate numeric,
    weekly_rate numeric,
    monthly_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.plate_number,
        v.make,
        v.model,
        v.year,
        v.status,
        vp.daily_rate,
        vp.weekly_rate,
        vp.monthly_rate
    FROM public.vehicles v
    LEFT JOIN public.vehicle_pricing vp ON v.id = vp.vehicle_id AND vp.is_active = true
    WHERE v.company_id = company_id_param
    AND v.is_active = true
    AND v.status IN ('available', 'reserved')
    AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_maintenance vm
        WHERE vm.vehicle_id = v.id
        AND vm.status IN ('pending', 'in_progress')
    )
    ORDER BY v.plate_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';