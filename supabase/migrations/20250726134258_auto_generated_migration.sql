-- إضافة ترايجر لإنشاء حساب مالي للعميل تلقائيًا عند إنشاء عميل جديد
-- وذلك لتجنب مشاكل إنشاء الحساب المنفصل

-- إنشاء الوظيفة للترايجر
CREATE OR REPLACE FUNCTION public.create_customer_account_trigger()
RETURNS TRIGGER AS $$
DECLARE
    customer_name_full text;
BEGIN
    -- تكوين اسم العميل
    IF NEW.customer_type = 'individual' THEN
        customer_name_full := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
    ELSE
        customer_name_full := COALESCE(NEW.company_name, 'Corporate Customer');
    END IF;
    
    customer_name_full := TRIM(customer_name_full);
    
    -- إنشاء حساب مالي للعميل
    BEGIN
        PERFORM public.create_customer_financial_account(
            NEW.company_id,
            NEW.id,
            customer_name_full
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- تسجيل الخطأ ولكن لا تفشل إنشاء العميل
            RAISE WARNING 'Failed to create financial account for customer %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف الترايجر إذا كان موجودًا
DROP TRIGGER IF EXISTS trigger_create_customer_account ON public.customers;

-- إنشاء الترايجر
CREATE TRIGGER trigger_create_customer_account
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.create_customer_account_trigger();