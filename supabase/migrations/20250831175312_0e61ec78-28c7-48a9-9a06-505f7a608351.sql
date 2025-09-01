-- إصلاح مشكلة اختفاء شركة النظام - الجزء الثاني: تحديث السياسات وإصلاح الدوال

-- أولاً: حذف السياسات التي تعتمد على get_user_company_fixed
DROP POLICY IF EXISTS "Admins can manage customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Staff can create contracts in their company" ON public.contracts;

-- الآن يمكننا حذف الدالة القديمة وإنشاء دالة جديدة
DROP FUNCTION IF EXISTS public.get_user_company_fixed(uuid) CASCADE;

-- إنشاء الدالة المحسنة الجديدة
CREATE OR REPLACE FUNCTION public.get_user_company_safe(user_id_param uuid DEFAULT auth.uid())
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
            NEW.company_id := public.get_user_company_safe();
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

-- إنشاء سياسات RLS جديدة للعملاء
CREATE POLICY "مديرو النظام يمكنهم إدارة جميع العملاء"
ON public.customers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "المديرون يمكنهم إدارة العملاء في شركاتهم"
ON public.customers FOR ALL
TO authenticated
USING (
    company_id = public.get_user_company_safe(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    )
)
WITH CHECK (
    company_id = public.get_user_company_safe(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    )
);

CREATE POLICY "المستخدمون يمكنهم عرض العملاء في شركاتهم"
ON public.customers FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_safe(auth.uid()));

-- إضافة دالة لتتبع تحديثات العملاء
CREATE OR REPLACE FUNCTION public.log_customer_update()
RETURNS trigger AS $$
BEGIN
    -- تسجيل تفصيلي للتحديثات
    RAISE NOTICE '🔄 تحديث عميل - معرف العميل: %, الشركة القديمة: %, الشركة الجديدة: %, الاسم: % %',
                 NEW.id,
                 OLD.company_id,
                 NEW.company_id,
                 COALESCE(NEW.first_name, NEW.company_name),
                 COALESCE(NEW.last_name, '');
    
    -- التحقق من تغيير company_id
    IF OLD.company_id != NEW.company_id THEN
        RAISE WARNING '⚠️ تم تغيير company_id للعميل % من % إلى %',
                      NEW.id, OLD.company_id, NEW.company_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للتسجيل
DROP TRIGGER IF EXISTS log_customer_update_trigger ON public.customers;
CREATE TRIGGER log_customer_update_trigger
    AFTER UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.log_customer_update();

-- إضافة تعليقات للتوثيق
COMMENT ON FUNCTION public.get_user_company_safe IS 'دالة آمنة للحصول على معرف الشركة للمستخدم مع معالجة الأخطاء الشائعة';
COMMENT ON FUNCTION public.validate_customer_company_update IS 'دالة للتحقق من صحة بيانات الشركة عند تحديث العملاء';
COMMENT ON FUNCTION public.log_customer_update IS 'دالة لتسجيل تحديثات العملاء للمراقبة والتتبع';