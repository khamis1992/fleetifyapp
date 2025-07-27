-- Fix the vehicle financial integration trigger timing issue
-- Drop the existing trigger
DROP TRIGGER IF EXISTS vehicle_financial_integration_trigger ON public.vehicles;

-- Recreate the trigger to run AFTER INSERT instead of BEFORE INSERT
-- This ensures the vehicle ID exists in the database before the function tries to access it
CREATE TRIGGER vehicle_financial_integration_trigger
    AFTER INSERT OR UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_vehicle_financial_integration();

-- Also update the function to be more robust with error handling
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
    -- Skip processing if this is an UPDATE and no relevant fields changed
    IF TG_OP = 'UPDATE' AND 
       OLD.purchase_cost = NEW.purchase_cost AND 
       OLD.cost_center_id = NEW.cost_center_id THEN
        RETURN NEW;
    END IF;

    -- Get maintenance and operations cost center for the company
    SELECT id INTO maint_ops_center_id
    FROM public.cost_centers
    WHERE company_id = NEW.company_id
    AND center_code = 'MAINT_OPS'
    AND is_active = true
    LIMIT 1;
    
    -- Set default cost center if not specified
    IF NEW.cost_center_id IS NULL AND maint_ops_center_id IS NOT NULL THEN
        UPDATE public.vehicles 
        SET cost_center_id = maint_ops_center_id
        WHERE id = NEW.id;
    END IF;
    
    -- Create fixed asset entry for new vehicles with purchase cost
    IF TG_OP = 'INSERT' AND COALESCE(NEW.purchase_cost, 0) > 0 THEN
        BEGIN
            fixed_asset_id := public.create_vehicle_fixed_asset_entry(NEW.id);
            
            IF fixed_asset_id IS NOT NULL THEN
                UPDATE public.vehicles 
                SET fixed_asset_id = fixed_asset_id
                WHERE id = NEW.id;
            END IF;
            
            -- Create journal entry for purchase
            purchase_journal_id := public.create_vehicle_purchase_journal_entry(NEW.id);
            
            IF purchase_journal_id IS NOT NULL THEN
                UPDATE public.vehicles 
                SET journal_entry_id = purchase_journal_id
                WHERE id = NEW.id;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the vehicle creation
                RAISE WARNING 'Failed to create financial entries for vehicle %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    -- Calculate total costs (with error handling)
    BEGIN
        PERFORM public.calculate_vehicle_total_costs(NEW.id);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to calculate total costs for vehicle %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;