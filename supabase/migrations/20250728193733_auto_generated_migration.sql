-- إصلاح الدوال الجديدة بإضافة search_path
CREATE OR REPLACE FUNCTION public.generate_contract_number(company_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    contract_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد العقود الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO contract_count
    FROM public.contracts 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم العقد المنسق
    RETURN 'CON-' || year_suffix || '-' || LPAD(contract_count::TEXT, 4, '0');
END;
$function$;

-- إصلاح دالة trigger بإضافة search_path
CREATE OR REPLACE FUNCTION public.handle_contract_number_generation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- إذا لم يتم تحديد رقم العقد، قم بتوليده تلقائياً
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := public.generate_contract_number(NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$function$;