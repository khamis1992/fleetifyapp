-- Create default "Maintenance and Operations" cost center for all companies
INSERT INTO public.cost_centers (
    id,
    company_id,
    center_code,
    center_name,
    center_name_ar,
    description,
    is_active
)
SELECT 
    gen_random_uuid(),
    c.id,
    'MAINT_OPS',
    'Maintenance and Operations',
    'الصيانة والعمليات',
    'Default cost center for vehicle maintenance and operations',
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc 
    WHERE cc.company_id = c.id AND cc.center_code = 'MAINT_OPS'
);

-- Update the vehicle financial integration trigger to create fixed asset entries
CREATE OR REPLACE FUNCTION public.create_vehicle_fixed_asset_entry(vehicle_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_record RECORD;
    asset_id uuid;
    asset_account_id uuid;
    depreciation_account_id uuid;
BEGIN
    -- Get vehicle details
    SELECT * INTO vehicle_record
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle not found';
    END IF;
    
    -- Skip if no purchase cost or already has fixed asset
    IF COALESCE(vehicle_record.purchase_cost, 0) <= 0 THEN
        RETURN NULL;
    END IF;
    
    -- Check if fixed asset already exists
    IF EXISTS (
        SELECT 1 FROM public.fixed_assets 
        WHERE serial_number = vehicle_record.plate_number 
        AND company_id = vehicle_record.company_id
    ) THEN
        SELECT id INTO asset_id FROM public.fixed_assets 
        WHERE serial_number = vehicle_record.plate_number 
        AND company_id = vehicle_record.company_id;
        RETURN asset_id;
    END IF;
    
    -- Find appropriate accounts
    SELECT id INTO asset_account_id
    FROM public.chart_of_accounts
    WHERE company_id = vehicle_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%vehicle%' OR account_name ILIKE '%equipment%' OR account_name ILIKE '%مركبة%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO depreciation_account_id
    FROM public.chart_of_accounts
    WHERE company_id = vehicle_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%accumulated%depreciation%' OR account_name ILIKE '%إهلاك%')
    AND is_active = true
    LIMIT 1;
    
    -- Create fixed asset entry
    INSERT INTO public.fixed_assets (
        id,
        company_id,
        asset_code,
        asset_name,
        asset_name_ar,
        category,
        serial_number,
        purchase_date,
        purchase_cost,
        useful_life_years,
        salvage_value,
        depreciation_method,
        asset_account_id,
        depreciation_account_id,
        location,
        condition_status,
        book_value,
        notes
    ) VALUES (
        gen_random_uuid(),
        vehicle_record.company_id,
        'VEH-' || vehicle_record.plate_number,
        COALESCE(vehicle_record.make, '') || ' ' || COALESCE(vehicle_record.model, '') || ' (' || vehicle_record.plate_number || ')',
        COALESCE(vehicle_record.make, '') || ' ' || COALESCE(vehicle_record.model, '') || ' (' || vehicle_record.plate_number || ')',
        'Vehicles',
        vehicle_record.plate_number,
        COALESCE(vehicle_record.purchase_date, vehicle_record.created_at::date),
        vehicle_record.purchase_cost,
        COALESCE(vehicle_record.useful_life_years, 5), -- Default 5 years
        COALESCE(vehicle_record.salvage_value, vehicle_record.purchase_cost * 0.1), -- Default 10% salvage
        'straight_line',
        asset_account_id,
        depreciation_account_id,
        'Fleet Department',
        'good',
        vehicle_record.purchase_cost,
        'Auto-created from vehicle: ' || vehicle_record.plate_number
    ) RETURNING id INTO asset_id;
    
    RETURN asset_id;
END;
$function$;

-- Enhanced vehicle financial integration trigger
CREATE OR REPLACE FUNCTION public.handle_vehicle_financial_integration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    purchase_journal_id UUID;
    fixed_asset_id UUID;
    maint_ops_center_id UUID;
BEGIN
    -- Get maintenance and operations cost center for the company
    SELECT id INTO maint_ops_center_id
    FROM public.cost_centers
    WHERE company_id = NEW.company_id
    AND center_code = 'MAINT_OPS'
    AND is_active = true
    LIMIT 1;
    
    -- Set default cost center if not specified
    IF NEW.cost_center_id IS NULL AND maint_ops_center_id IS NOT NULL THEN
        NEW.cost_center_id = maint_ops_center_id;
    END IF;
    
    -- Create fixed asset entry for new vehicles with purchase cost
    IF TG_OP = 'INSERT' AND COALESCE(NEW.purchase_cost, 0) > 0 THEN
        fixed_asset_id := public.create_vehicle_fixed_asset_entry(NEW.id);
        NEW.fixed_asset_id = fixed_asset_id;
        
        -- Create journal entry for purchase
        purchase_journal_id := public.create_vehicle_purchase_journal_entry(NEW.id);
        NEW.journal_entry_id = purchase_journal_id;
    END IF;
    
    -- Calculate total costs
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.calculate_vehicle_total_costs(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create function to process vehicle depreciation monthly
CREATE OR REPLACE FUNCTION public.process_vehicle_depreciation_monthly(company_id_param uuid, depreciation_date_param date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_asset_record record;
    monthly_depreciation numeric;
    processed_count integer := 0;
    journal_entry_id uuid;
BEGIN
    -- Process depreciation for all vehicle-related fixed assets
    FOR vehicle_asset_record IN 
        SELECT fa.* FROM public.fixed_assets fa
        WHERE fa.company_id = company_id_param 
        AND fa.is_active = true 
        AND fa.disposal_date IS NULL
        AND fa.useful_life_years > 0
        AND fa.category = 'Vehicles'
        AND fa.purchase_cost > 0
    LOOP
        -- Calculate monthly depreciation (straight line method)
        monthly_depreciation := (vehicle_asset_record.purchase_cost - COALESCE(vehicle_asset_record.salvage_value, 0)) / (vehicle_asset_record.useful_life_years * 12);
        
        -- Skip if depreciation amount is negligible
        IF monthly_depreciation < 0.01 THEN
            CONTINUE;
        END IF;
        
        -- Check if depreciation already processed for this period
        IF EXISTS (
            SELECT 1 FROM public.depreciation_records 
            WHERE fixed_asset_id = vehicle_asset_record.id 
            AND depreciation_date = depreciation_date_param
        ) THEN
            CONTINUE;
        END IF;
        
        -- Skip if fully depreciated
        IF COALESCE(vehicle_asset_record.accumulated_depreciation, 0) >= (vehicle_asset_record.purchase_cost - COALESCE(vehicle_asset_record.salvage_value, 0)) THEN
            CONTINUE;
        END IF;
        
        -- Create depreciation record
        INSERT INTO public.depreciation_records (
            id,
            fixed_asset_id,
            depreciation_amount,
            depreciation_date,
            accumulated_depreciation,
            book_value,
            period_type,
            notes
        ) VALUES (
            gen_random_uuid(),
            vehicle_asset_record.id,
            monthly_depreciation,
            depreciation_date_param,
            COALESCE(vehicle_asset_record.accumulated_depreciation, 0) + monthly_depreciation,
            vehicle_asset_record.purchase_cost - (COALESCE(vehicle_asset_record.accumulated_depreciation, 0) + monthly_depreciation),
            'monthly',
            'Automatic monthly vehicle depreciation'
        );
        
        -- Update asset accumulated depreciation
        UPDATE public.fixed_assets
        SET accumulated_depreciation = COALESCE(accumulated_depreciation, 0) + monthly_depreciation,
            book_value = purchase_cost - (COALESCE(accumulated_depreciation, 0) + monthly_depreciation),
            updated_at = now()
        WHERE id = vehicle_asset_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$function$;

-- Add cost_center_id and fixed_asset_id to vehicles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'cost_center_id') THEN
        ALTER TABLE public.vehicles ADD COLUMN cost_center_id uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'fixed_asset_id') THEN
        ALTER TABLE public.vehicles ADD COLUMN fixed_asset_id uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'useful_life_years') THEN
        ALTER TABLE public.vehicles ADD COLUMN useful_life_years integer DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'salvage_value') THEN
        ALTER TABLE public.vehicles ADD COLUMN salvage_value numeric DEFAULT 0;
    END IF;
END $$;