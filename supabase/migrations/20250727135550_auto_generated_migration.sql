-- Drop the existing AFTER INSERT trigger
DROP TRIGGER IF EXISTS create_vehicle_fixed_asset_trigger ON public.vehicles;

-- Update the create_vehicle_fixed_asset function with proper error handling and validation
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
    -- Only create fixed asset if purchase_cost is greater than 0
    IF COALESCE(NEW.purchase_cost, 0) <= 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get asset account
    SELECT id INTO asset_account_id
    FROM public.chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%vehicle%' OR account_name ILIKE '%equipment%' OR account_name ILIKE '%fixed%asset%')
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
    
    -- Create fixed asset record with proper validation
    BEGIN
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
            COALESCE(NEW.make, 'Unknown') || ' ' || COALESCE(NEW.model, 'Model') || ' (' || COALESCE(NEW.year::text, 'N/A') || ')',
            COALESCE(NEW.make, 'Unknown') || ' ' || COALESCE(NEW.model, 'Model') || ' (' || COALESCE(NEW.year::text, 'N/A') || ')',
            'Vehicle',
            NEW.purchase_cost,
            COALESCE(NEW.purchase_date, NEW.created_at::date),
            COALESCE(NEW.useful_life_years, 5),
            'straight_line',
            NEW.location,
            NEW.vin,
            'good',
            asset_account_id,
            depreciation_account_id,
            NEW.purchase_cost,
            'Automatically created from vehicle: ' || COALESCE(NEW.plate_number, 'Unknown')
        ) RETURNING id INTO new_asset_id;
        
        -- Update vehicle with fixed asset reference
        NEW.fixed_asset_id = new_asset_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error and continue without creating fixed asset
            RAISE WARNING 'Failed to create fixed asset for vehicle %: %', COALESCE(NEW.plate_number, 'Unknown'), SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;

-- Create new BEFORE INSERT trigger
CREATE TRIGGER create_vehicle_fixed_asset_trigger
    BEFORE INSERT ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_vehicle_fixed_asset();