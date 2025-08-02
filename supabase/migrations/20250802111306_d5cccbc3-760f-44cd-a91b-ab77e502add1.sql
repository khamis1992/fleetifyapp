-- Drop and recreate the validate_contract_account trigger with proper INSERT/UPDATE handling
DROP TRIGGER IF EXISTS validate_contract_account_trigger ON public.contracts;

-- Create an updated function that properly handles INSERT operations
CREATE OR REPLACE FUNCTION public.validate_contract_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Skip validation if no account_id is being set
    IF NEW.account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- For UPDATE operations only: Skip validation if only status field is changing
    IF TG_OP = 'UPDATE' AND OLD.account_id IS NOT NULL THEN
        -- Compare key fields to detect if only status changed
        IF OLD.account_id = NEW.account_id AND 
           OLD.status != NEW.status AND
           OLD.contract_number = NEW.contract_number AND
           OLD.customer_id = NEW.customer_id AND
           COALESCE(OLD.vehicle_id::text, '') = COALESCE(NEW.vehicle_id::text, '') AND
           OLD.contract_amount = NEW.contract_amount AND
           OLD.monthly_amount = NEW.monthly_amount AND
           OLD.start_date = NEW.start_date AND
           OLD.end_date = NEW.end_date THEN
            RETURN NEW;
        END IF;
    END IF;
    
    -- Validate account for both INSERT and UPDATE operations
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 3 أو أعلى)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Recreate the trigger for both INSERT and UPDATE operations
CREATE TRIGGER validate_contract_account_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_contract_account();