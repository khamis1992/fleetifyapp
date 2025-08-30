-- إصلاح دالة get_available_vehicles_for_contracts لتشمل جميع الحقول المطلوبة
CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid)
RETURNS TABLE(
    id uuid,
    plate_number text,
    make text,
    model text,
    year integer,
    color text,
    status text,
    daily_rate numeric,
    weekly_rate numeric,
    monthly_rate numeric,
    minimum_rental_price numeric,
    enforce_minimum_price boolean,
    is_active boolean,
    company_id uuid
)
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
        v.color,
        v.status,
        COALESCE(v.daily_rate, 0) as daily_rate,
        COALESCE(v.weekly_rate, 0) as weekly_rate,
        COALESCE(v.monthly_rate, 0) as monthly_rate,
        COALESCE(v.minimum_rental_price, 0) as minimum_rental_price,
        COALESCE(v.enforce_minimum_price, false) as enforce_minimum_price,
        v.is_active,
        v.company_id
    FROM public.vehicles v
    WHERE v.company_id = company_id_param
    AND v.is_active = true
    AND v.status IN ('available', 'reserved')
    ORDER BY v.plate_number;
END;
$function$;