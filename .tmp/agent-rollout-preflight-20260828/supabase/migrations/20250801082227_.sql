-- Phase 1: Immediate Fix - Modify validate_contract_account function
-- Skip account validation when only status field is being updated

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
    
    -- Skip validation if this is an UPDATE and only status field is changing
    -- Compare key fields to detect if only status changed
    IF TG_OP = 'UPDATE' AND 
       OLD.account_id = NEW.account_id AND 
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
    
    -- Check if the account is allowed for entries (only when account_id is being set/changed)
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 5 أو 6)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;;
