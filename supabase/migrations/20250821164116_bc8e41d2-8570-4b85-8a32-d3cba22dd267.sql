-- Create the missing recalculate_account_levels function
CREATE OR REPLACE FUNCTION public.recalculate_account_levels(company_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    current_level INTEGER;
    max_iterations INTEGER := 10;
    iteration_count INTEGER := 0;
BEGIN
    -- Reset all levels to 1 initially
    UPDATE chart_of_accounts 
    SET account_level = 1, updated_at = now()
    WHERE company_id = company_id_param;
    
    -- Calculate levels iteratively
    LOOP
        iteration_count := iteration_count + 1;
        
        -- Update accounts that have parents with known levels
        UPDATE chart_of_accounts 
        SET account_level = parent_acc.account_level + 1,
            updated_at = now()
        FROM chart_of_accounts parent_acc
        WHERE chart_of_accounts.parent_account_id = parent_acc.id
        AND chart_of_accounts.company_id = company_id_param
        AND parent_acc.company_id = company_id_param
        AND chart_of_accounts.account_level <= parent_acc.account_level;
        
        -- Exit if no changes or max iterations reached
        IF NOT FOUND OR iteration_count >= max_iterations THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- Log the completion
    RAISE NOTICE 'Account levels recalculated for company % in % iterations', company_id_param, iteration_count;
END;
$function$;