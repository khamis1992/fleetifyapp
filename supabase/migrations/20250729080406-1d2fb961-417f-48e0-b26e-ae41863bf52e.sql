-- إنشاء دالة للتحقق من العميل المحظور
CREATE OR REPLACE FUNCTION public.check_blacklisted_customer()
RETURNS TRIGGER AS $$
DECLARE
    existing_customer_name TEXT;
    blocked_reason TEXT;
BEGIN
    -- التحقق من وجود عميل محظور بنفس البطاقة الشخصية في نفس الشركة
    IF NEW.national_id IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
                ELSE company_name 
            END,
            blacklist_reason
        INTO existing_customer_name, blocked_reason
        FROM public.customers 
        WHERE company_id = NEW.company_id 
        AND national_id = NEW.national_id 
        AND is_blacklisted = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        LIMIT 1;
        
        IF existing_customer_name IS NOT NULL THEN
            RAISE EXCEPTION 'العميل محظور: يوجد عميل محظور بنفس رقم البطاقة الشخصية (%). السبب: %', 
                existing_customer_name, COALESCE(blocked_reason, 'غير محدد')
                USING ERRCODE = 'unique_violation';
        END IF;
    END IF;
    
    -- التحقق من وجود عميل محظور بنفس رقم الجواز في نفس الشركة
    IF NEW.passport_number IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
                ELSE company_name 
            END,
            blacklist_reason
        INTO existing_customer_name, blocked_reason
        FROM public.customers 
        WHERE company_id = NEW.company_id 
        AND passport_number = NEW.passport_number 
        AND is_blacklisted = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        LIMIT 1;
        
        IF existing_customer_name IS NOT NULL THEN
            RAISE EXCEPTION 'العميل محظور: يوجد عميل محظور بنفس رقم الجواز (%). السبب: %', 
                existing_customer_name, COALESCE(blocked_reason, 'غير محدد')
                USING ERRCODE = 'unique_violation';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء Trigger للتحقق من العميل المحظور عند الإدراج والتحديث
DROP TRIGGER IF EXISTS check_blacklisted_customer_trigger ON public.customers;
CREATE TRIGGER check_blacklisted_customer_trigger
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.check_blacklisted_customer();