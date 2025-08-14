-- إضافة حقل تاريخ انتهاء البطاقة المدنية وتحديث حقل انتهاء الرخصة
ALTER TABLE public.customers 
ADD COLUMN national_id_expiry DATE;

-- تحديث نوع بيانات تاريخ انتهاء الرخصة ليكون date بدلاً من string
ALTER TABLE public.customers 
ALTER COLUMN license_expiry TYPE DATE USING license_expiry::date;

-- إنشاء دالة للتحقق من صلاحية وثائق العميل
CREATE OR REPLACE FUNCTION public.validate_customer_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- التحقق من انتهاء صلاحية البطاقة المدنية
    IF NEW.national_id_expiry IS NOT NULL AND NEW.national_id_expiry < CURRENT_DATE THEN
        RAISE EXCEPTION 'البطاقة المدنية منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل'
            USING ERRCODE = 'check_violation';
    END IF;
    
    -- التحقق من انتهاء صلاحية الرخصة (إذا كانت موجودة)
    IF NEW.license_expiry IS NOT NULL AND NEW.license_expiry < CURRENT_DATE THEN
        RAISE EXCEPTION 'رخصة القيادة منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إنشاء trigger للتحقق من صلاحية الوثائق عند إدخال أو تحديث العميل
CREATE TRIGGER validate_customer_documents_trigger
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_customer_documents();

-- إنشاء دالة للتحقق من صلاحية وثائق العميل في العقود
CREATE OR REPLACE FUNCTION public.validate_customer_documents_for_contracts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
BEGIN
    -- الحصول على بيانات العميل
    SELECT national_id_expiry, license_expiry, national_id, license_number
    INTO customer_record
    FROM public.customers
    WHERE id = NEW.customer_id;
    
    -- التحقق من انتهاء صلاحية البطاقة المدنية
    IF customer_record.national_id_expiry IS NOT NULL AND customer_record.national_id_expiry < CURRENT_DATE THEN
        RAISE EXCEPTION 'لا يمكن إنشاء عقد للعميل: البطاقة المدنية منتهية الصلاحية (انتهت في %)', 
            customer_record.national_id_expiry
            USING ERRCODE = 'check_violation';
    END IF;
    
    -- التحقق من انتهاء صلاحية الرخصة (إذا كانت موجودة)
    IF customer_record.license_number IS NOT NULL AND customer_record.license_expiry IS NOT NULL AND customer_record.license_expiry < CURRENT_DATE THEN
        RAISE EXCEPTION 'لا يمكن إنشاء عقد للعميل: رخصة القيادة منتهية الصلاحية (انتهت في %)', 
            customer_record.license_expiry
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إنشاء trigger للتحقق من صلاحية وثائق العميل عند إنشاء عقد
CREATE TRIGGER validate_customer_documents_for_contracts_trigger
    BEFORE INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_customer_documents_for_contracts();