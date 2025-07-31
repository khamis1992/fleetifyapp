-- Fix ambiguous column reference in validate_account_level_for_entries function
CREATE OR REPLACE FUNCTION public.validate_account_level_for_entries(account_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_level integer;
    is_header boolean;
BEGIN
    SELECT coa.account_level, coa.is_header 
    INTO account_level, is_header
    FROM public.chart_of_accounts coa
    WHERE coa.id = account_id_param
    AND coa.is_active = true;
    
    -- Allow accounts at level 3 and above if they are not headers
    RETURN account_level >= 3 AND is_header = false;
END;
$function$