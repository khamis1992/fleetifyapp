-- Drop the existing problematic function if it exists
DROP FUNCTION IF EXISTS public.get_available_vehicles_for_contracts(uuid);

-- Create a corrected function for getting available vehicles for contracts
CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid)
RETURNS TABLE(
    id uuid,
    plate_number text,
    make text,
    model text,
    year integer,
    status text,
    daily_rate numeric,
    weekly_rate numeric,
    monthly_rate numeric,
    color text,
    vehicle_type text,
    fuel_type text,
    current_mileage integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.plate_number,
        v.make,
        v.model,
        v.year,
        v.status,
        COALESCE(v.daily_rate, 0) as daily_rate,
        COALESCE(v.weekly_rate, 0) as weekly_rate,
        COALESCE(v.monthly_rate, 0) as monthly_rate,
        v.color,
        v.vehicle_type,
        v.fuel_type,
        v.current_mileage
    FROM public.vehicles v
    WHERE v.company_id = company_id_param
    AND v.is_active = true
    AND v.status IN ('available', 'reserved')
    ORDER BY v.plate_number;
END;
$$;