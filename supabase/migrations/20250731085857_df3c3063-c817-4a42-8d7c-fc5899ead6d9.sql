-- Fix the get_available_vehicles_for_contracts function to handle vehicle_status enum correctly
CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid)
 RETURNS TABLE(id uuid, plate_number text, make text, model text, year integer, status text, daily_rate numeric, weekly_rate numeric, monthly_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.plate_number,
        v.make,
        v.model,
        v.year,
        v.status::text,  -- Cast enum to text to avoid type mismatch
        vp.daily_rate,
        vp.weekly_rate,
        vp.monthly_rate
    FROM public.vehicles v
    LEFT JOIN public.vehicle_pricing vp ON v.id = vp.vehicle_id AND vp.is_active = true
    WHERE v.company_id = company_id_param
    AND v.is_active = true
    AND v.status IN ('available', 'reserved')
    AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_maintenance vm
        WHERE vm.vehicle_id = v.id
        AND vm.status IN ('pending', 'in_progress')
    )
    ORDER BY v.plate_number;
END;
$function$