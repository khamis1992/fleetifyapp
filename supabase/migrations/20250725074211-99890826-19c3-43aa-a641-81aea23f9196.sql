-- Update the company creation trigger to include cost centers
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Copy default chart of accounts to the new company
    PERFORM copy_default_accounts_to_company(NEW.id);
    
    -- Copy default cost centers to the new company
    PERFORM copy_default_cost_centers_to_company(NEW.id);
    
    RETURN NEW;
END;
$function$