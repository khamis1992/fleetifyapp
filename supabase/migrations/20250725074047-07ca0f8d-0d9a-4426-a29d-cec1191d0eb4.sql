-- Create function to copy default cost centers to a company
CREATE OR REPLACE FUNCTION public.copy_default_cost_centers_to_company(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    default_center RECORD;
BEGIN
    -- Copy all default cost centers to the company
    FOR default_center IN 
        SELECT * FROM public.default_cost_centers 
        WHERE is_active = true
        ORDER BY sort_order, center_code
    LOOP
        -- Insert the cost center for the company
        INSERT INTO public.cost_centers (
            id,
            company_id,
            center_code,
            center_name,
            center_name_ar,
            description,
            budget_amount,
            actual_amount,
            is_active
        ) VALUES (
            gen_random_uuid(),
            target_company_id,
            default_center.center_code,
            default_center.center_name,
            default_center.center_name_ar,
            default_center.description,
            0,
            0,
            true
        );
    END LOOP;
END;
$function$