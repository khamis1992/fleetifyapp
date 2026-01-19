-- Fix get_available_vehicles_for_contracts function to handle new vehicle fields
CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid, contract_date_start date DEFAULT NULL::date, contract_date_end date DEFAULT NULL::date)
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
    company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Debug logging
    RAISE NOTICE 'get_available_vehicles_for_contracts called with company_id: %, start_date: %, end_date: %', 
        company_id_param, contract_date_start, contract_date_end;
    
    -- If no company_id provided, return empty
    IF company_id_param IS NULL THEN
        RAISE NOTICE 'No company_id provided, returning empty result';
        RETURN;
    END IF;
    
    -- Base query for available vehicles
    RETURN QUERY
    SELECT 
        v.id,
        v.plate_number,
        v.make,
        v.model,
        v.year,
        v.color,
        v.status,
        v.daily_rate,
        v.weekly_rate,
        v.monthly_rate,
        COALESCE(v.minimum_rental_price, 0) as minimum_rental_price,
        COALESCE(v.enforce_minimum_price, false) as enforce_minimum_price,
        v.company_id
    FROM public.vehicles v
    WHERE v.company_id = company_id_param
        AND v.is_active = true
        AND v.status IN ('available', 'reserved')
        AND (
            -- If no date range provided, return all available vehicles
            contract_date_start IS NULL 
            OR contract_date_end IS NULL
            OR NOT EXISTS (
                -- Check for conflicting contracts
                SELECT 1 FROM public.contracts c
                WHERE c.vehicle_id = v.id
                    AND c.status IN ('active', 'draft')
                    AND c.company_id = company_id_param
                    AND (
                        (c.start_date <= contract_date_end AND c.end_date >= contract_date_start)
                    )
            )
        )
    ORDER BY v.plate_number, v.make, v.model;
    
    -- Log result count
    GET DIAGNOSTICS RETURN_COUNT = ROW_COUNT;
    RAISE NOTICE 'Returning % vehicles for company %', RETURN_COUNT, company_id_param;
    
END;
$$;