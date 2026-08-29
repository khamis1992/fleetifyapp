-- Remove duplicate triggers that update vehicle status
DROP TRIGGER IF EXISTS contracts_vehicle_status_update ON contracts;
DROP TRIGGER IF EXISTS trg_update_vehicle_status_after ON contracts;
DROP TRIGGER IF EXISTS update_vehicle_status_on_contract_change ON contracts;

-- Remove duplicate calculate contract amount triggers  
DROP TRIGGER IF EXISTS trg_calculate_contract_amount ON contracts;

-- Remove duplicate log operations triggers
DROP TRIGGER IF EXISTS trigger_contract_operations_log ON contracts;
DROP TRIGGER IF EXISTS trigger_log_contract_operations ON contracts;

-- Remove conflicting handle_contract_activation (BEFORE version - keep AFTER only)
DROP TRIGGER IF EXISTS trigger_contract_activation ON contracts;

-- Create a single clean vehicle status update trigger
CREATE OR REPLACE FUNCTION update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.vehicle_id IS NOT NULL THEN
            IF NEW.status = 'active' THEN
                UPDATE vehicles SET status = 'rented'::vehicle_status
                WHERE id = NEW.vehicle_id AND status != 'rented';
            ELSIF NEW.status = 'draft' OR NEW.status = 'under_review' THEN
                UPDATE vehicles SET status = 'reserved'::vehicle_status
                WHERE id = NEW.vehicle_id AND status != 'reserved';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Skip if status hasn't changed
        IF NEW.status = OLD.status THEN
            RETURN NEW;
        END IF;
        
        IF NEW.vehicle_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Update vehicle based on new status
        IF NEW.status = 'active' THEN
            UPDATE vehicles SET status = 'rented'::vehicle_status
            WHERE id = NEW.vehicle_id AND status != 'rented';
        ELSIF NEW.status IN ('cancelled', 'closed', 'expired') THEN
            UPDATE vehicles SET status = 'available'::vehicle_status
            WHERE id = NEW.vehicle_id AND status != 'available';
        ELSIF NEW.status IN ('under_review', 'suspended', 'draft') THEN
            UPDATE vehicles SET status = 'reserved'::vehicle_status
            WHERE id = NEW.vehicle_id AND status != 'reserved';
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.vehicle_id IS NOT NULL THEN
            UPDATE vehicles SET status = 'available'::vehicle_status
            WHERE id = OLD.vehicle_id AND status != 'available';
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create single trigger for vehicle status
CREATE TRIGGER update_vehicle_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_status_from_contract();;
