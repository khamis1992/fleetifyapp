-- تحسين دالة الحصول على المركبات المتاحة للعقود
-- Improve function to get available vehicles for contracts with better pricing handling

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
        COALESCE(vp.daily_rate, v.daily_rate, 0) as daily_rate,
        COALESCE(vp.weekly_rate, v.weekly_rate, 0) as weekly_rate,
        COALESCE(vp.monthly_rate, v.monthly_rate, 0) as monthly_rate
    FROM public.vehicles v
    LEFT JOIN (
        SELECT DISTINCT ON (vehicle_id) 
            vehicle_id,
            daily_rate,
            weekly_rate,
            monthly_rate
        FROM public.vehicle_pricing 
        WHERE is_active = true 
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY vehicle_id, effective_from DESC
    ) vp ON v.id = vp.vehicle_id
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
$function$;