-- إضافة تريجر التحقق من الحسابات للعقود
CREATE OR REPLACE FUNCTION public.validate_contract_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- تخطي التحقق إذا لم يكن هناك حساب محاسبي
    IF NEW.account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- التحقق من أن الحساب مسموح للقيود
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 5 أو 6)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إضافة التريجر لجدول العقود
DROP TRIGGER IF EXISTS validate_contract_account_trigger ON public.contracts;
CREATE TRIGGER validate_contract_account_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_contract_account();

-- إضافة تريجر التحقق من الحسابات للمركبات
CREATE OR REPLACE FUNCTION public.validate_vehicle_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- تخطي التحقق إذا لم يكن هناك حساب محاسبي
    IF NEW.account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- التحقق من أن الحساب مسموح للقيود
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 5 أو 6)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إضافة التريجر لجدول المركبات
DROP TRIGGER IF EXISTS validate_vehicle_account_trigger ON public.vehicles;
CREATE TRIGGER validate_vehicle_account_trigger
    BEFORE INSERT OR UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_vehicle_account();

-- إضافة تريجر التحقق من الحسابات للعملاء
CREATE OR REPLACE FUNCTION public.validate_customer_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- تخطي التحقق إذا لم يكن هناك حساب محاسبي
    IF NEW.account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- التحقق من أن الحساب مسموح للقيود
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 5 أو 6)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إضافة التريجر لجدول العملاء
DROP TRIGGER IF EXISTS validate_customer_account_trigger ON public.customers;
CREATE TRIGGER validate_customer_account_trigger
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_customer_account();