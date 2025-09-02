-- حذف الدالة المكررة وإنشاء دالة واحدة محسنة
DROP FUNCTION IF EXISTS public.get_available_vehicles_for_contracts(uuid);
DROP FUNCTION IF EXISTS public.get_available_vehicles_for_contracts(uuid, date, date);

-- إنشاء دالة محسنة وموحدة
CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(
    company_id_param uuid,
    contract_start_date date DEFAULT NULL,
    contract_end_date date DEFAULT NULL
)
RETURNS TABLE (
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
        v.minimum_rental_price,
        v.enforce_minimum_price,
        v.company_id
    FROM vehicles v
    WHERE v.company_id = company_id_param
    AND v.is_active = true
    AND v.status IN ('available', 'reserved')
    AND (
        -- إذا لم يتم تمرير تواريخ، إرجاع جميع المركبات المتاحة
        contract_start_date IS NULL 
        OR contract_end_date IS NULL
        OR NOT EXISTS (
            -- فحص التضارب مع العقود الموجودة
            SELECT 1 FROM contracts c
            WHERE c.vehicle_id = v.id
            AND c.company_id = company_id_param
            AND c.status IN ('active', 'draft')
            AND (
                (c.start_date <= contract_end_date AND c.end_date >= contract_start_date)
            )
        )
    )
    ORDER BY v.plate_number;
END;
$$;