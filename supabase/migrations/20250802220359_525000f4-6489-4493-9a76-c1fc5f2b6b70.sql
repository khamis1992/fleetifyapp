-- Create helper function to validate contract existence
CREATE OR REPLACE FUNCTION public.validate_contract_exists(contract_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE id = contract_id_param
    );
END;
$function$;