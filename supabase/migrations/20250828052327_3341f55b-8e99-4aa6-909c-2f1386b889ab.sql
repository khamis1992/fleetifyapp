-- إعادة إنشاء دالة توليد كود العميل لتستقبل نوع customer_type بدلاً من text
DROP FUNCTION IF EXISTS public.generate_customer_code(uuid, text);

CREATE OR REPLACE FUNCTION public.generate_customer_code(
    p_company_id uuid,
    p_customer_type customer_type
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_count INTEGER;
    year_suffix TEXT;
    prefix TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Set prefix based on customer type
    CASE p_customer_type
        WHEN 'individual' THEN
            prefix := 'IND';
        WHEN 'corporate' THEN
            prefix := 'CORP';
        ELSE
            prefix := 'CUST';
    END CASE;
    
    -- Count existing customers for this company and type in current year
    SELECT COUNT(*) + 1 INTO customer_count
    FROM public.customers 
    WHERE company_id = p_company_id 
    AND customer_type = p_customer_type
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted customer code
    RETURN prefix || '-' || year_suffix || '-' || LPAD(customer_count::TEXT, 4, '0');
EXCEPTION
    WHEN OTHERS THEN
        -- Return a fallback code if something goes wrong
        RETURN 'CUST-' || year_suffix || '-0001';
END;
$function$;