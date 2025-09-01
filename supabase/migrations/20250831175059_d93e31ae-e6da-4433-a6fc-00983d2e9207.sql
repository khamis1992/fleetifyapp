-- إصلاح مشكلة اختفاء شركة النظام - الجزء الأول: حذف الدوال القديمة
DROP FUNCTION IF EXISTS public.get_user_company_fixed(uuid);
DROP FUNCTION IF EXISTS public.get_user_company_fixed();

-- الآن إنشاء الدالة المحسنة
CREATE OR REPLACE FUNCTION public.get_user_company_fixed(user_id_param uuid DEFAULT auth.uid())
RETURNS uuid AS $$
DECLARE
    company_id_result uuid;
BEGIN
    -- محاولة الحصول على company_id من profiles أولاً
    SELECT company_id INTO company_id_result
    FROM public.profiles
    WHERE user_id = user_id_param
    AND company_id IS NOT NULL
    LIMIT 1;
    
    -- إذا لم نجد شيء، نحاول من user_roles
    IF company_id_result IS NULL THEN
        SELECT company_id INTO company_id_result
        FROM public.user_roles
        WHERE user_id = user_id_param
        AND company_id IS NOT NULL
        LIMIT 1;
    END IF;
    
    -- إذا لم نجد شيء، نحاول من employees
    IF company_id_result IS NULL THEN
        SELECT company_id INTO company_id_result
        FROM public.employees
        WHERE user_id = user_id_param
        AND company_id IS NOT NULL
        LIMIT 1;
    END IF;
    
    RETURN company_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة للتحقق من صحة company_id أثناء التحديث
CREATE OR REPLACE FUNCTION public.validate_customer_company_update()
RETURNS trigger AS $$
BEGIN
    -- التأكد من أن company_id لا يتم حذفه أو تغييره بطريقة خاطئة
    IF NEW.company_id IS NULL OR NEW.company_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
        -- محاولة استرداد company_id من القيمة القديمة
        IF OLD.company_id IS NOT NULL THEN
            NEW.company_id := OLD.company_id;
            RAISE NOTICE 'تم استرداد company_id من القيمة القديمة للعميل: %', NEW.id;
        ELSE
            -- محاولة الحصول على company_id من المستخدم الحالي
            NEW.company_id := public.get_user_company_fixed();
            IF NEW.company_id IS NULL THEN
                RAISE EXCEPTION 'لا يمكن تحديد الشركة للعميل. يرجى التأكد من ربط المستخدم بشركة صحيحة.';
            END IF;
            RAISE NOTICE 'تم تعيين company_id من المستخدم الحالي للعميل: %', NEW.id;
        END IF;
    END IF;
    
    -- التأكد من وجود الشركة
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.company_id) THEN
        RAISE EXCEPTION 'الشركة المحددة غير موجودة: %', NEW.company_id;
    END IF;
    
    -- تسجيل العملية
    RAISE NOTICE 'تحديث عميل - ID: %, Company: %, Name: % %', 
                 NEW.id, NEW.company_id, 
                 COALESCE(NEW.first_name, NEW.company_name), 
                 COALESCE(NEW.last_name, '');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للتحقق من صحة البيانات أثناء التحديث
DROP TRIGGER IF EXISTS validate_customer_company_update_trigger ON public.customers;
CREATE TRIGGER validate_customer_company_update_trigger
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_customer_company_update();