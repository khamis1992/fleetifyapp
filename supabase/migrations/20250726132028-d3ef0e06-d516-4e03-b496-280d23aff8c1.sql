-- Fix the create_vehicle_fixed_asset trigger to remove reference to non-existent condition_status column
CREATE OR REPLACE FUNCTION public.create_vehicle_fixed_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        NEW.make || ' ' || NEW.model || ' (' || NEW.year || ')',
        'Vehicle',
        COALESCE(NEW.purchase_cost, 0),
        COALESCE(NEW.purchase_date, NEW.created_at::date),
        COALESCE(NEW.useful_life_years, 5),
        'straight_line',
        NEW.location,
        NEW.vin,
        'good',  -- Fixed: Use default value instead of non-existent NEW.condition_status
        asset_account_id,
        depreciation_account_id,
        COALESCE(NEW.purchase_cost, 0),
        'Automatically created from vehicle: ' || NEW.plate_number
    ) RETURNING id INTO new_asset_id;
    
    -- Update vehicle with fixed asset reference
    UPDATE public.vehicles
    SET fixed_asset_id = new_asset_id
    WHERE id = NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue without creating fixed asset
        RAISE WARNING 'Failed to create fixed asset for vehicle %: %', NEW.plate_number, SQLERRM;
        RETURN NEW;
END;
$function$;