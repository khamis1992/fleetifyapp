-- إنشاء دالة توليد كود العميل
CREATE OR REPLACE FUNCTION public.generate_customer_code(p_company_id uuid, p_customer_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    customer_count INTEGER;
    year_suffix TEXT;
    prefix TEXT;
BEGIN
    -- تحديد البادئة حسب نوع العميل
    CASE p_customer_type
        WHEN 'individual' THEN prefix := 'IND';
        WHEN 'corporate' THEN prefix := 'CORP';
        ELSE prefix := 'CUST';
    END CASE;
    
    -- الحصول على السنة الحالية (آخر رقمين)
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد العملاء الموجودين للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO customer_count
    FROM customers 
    WHERE company_id = p_company_id 
    AND customer_type = p_customer_type
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع الكود المنسق
    RETURN prefix || '-' || year_suffix || '-' || LPAD(customer_count::TEXT, 4, '0');
END;
$function$;