-- Remove the problematic trigger and function that's causing the calculate_account_level error
DROP TRIGGER IF EXISTS trigger_update_account_level ON public.chart_of_accounts;
DROP FUNCTION IF EXISTS public.update_account_level();

-- Create a new manual function to update account levels when needed (without triggers)
CREATE OR REPLACE FUNCTION public.update_account_levels_manually(company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    account_record RECORD;
    calculated_level integer;
BEGIN
    -- Update all accounts in the company with correct levels
    FOR account_record IN 
        SELECT id FROM public.chart_of_accounts 
        WHERE company_id = company_id_param
        ORDER BY account_code
    LOOP
        calculated_level := calculate_account_level(account_record.id);
        
        UPDATE public.chart_of_accounts 
        SET account_level = calculated_level 
        WHERE id = account_record.id;
    END LOOP;
END;
$function$;