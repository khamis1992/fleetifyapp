-- إصلاح وظيفة get_dashboard_stats_safe لحل مشكلة عدم ظهور البيانات
-- Fix the authentication and RLS issues

DROP FUNCTION IF EXISTS public.get_dashboard_stats_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe(company_id_param uuid)
RETURNS TABLE(
    total_vehicles integer,
    vehicles_change text,
    active_contracts integer,
    contracts_change text,
    total_customers integer,
    customers_change text,
    total_employees integer,
    employees_change text,
    monthly_revenue numeric,
    revenue_change text,
    total_revenue numeric,
    maintenance_requests integer,
    pending_payments numeric,
    expiring_contracts integer,
    fleet_utilization numeric,
    avg_contract_value numeric,
    cash_flow numeric,
    profit_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_company_id uuid;
    can_access boolean := false;
BEGIN
    -- التحقق من المصادقة
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
    END IF;

    -- الحصول على معرف الشركة للمستخدم
    SELECT company_id INTO user_company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();

    -- التحقق من الصلاحية
    IF has_role(auth.uid(), 'super_admin'::user_role) THEN
        can_access := true;
    ELSIF user_company_id IS NOT NULL THEN
        -- للمستخدمين العاديين، يجب أن تطابق الشركة
        IF company_id_param IS NULL OR company_id_param = user_company_id THEN
            can_access := true;
        END IF;
    END IF;

    IF NOT can_access THEN
        RAISE EXCEPTION 'غير مسموح بالوصول إلى هذه البيانات';
    END IF;

    -- استخدام شركة المستخدم إذا لم يتم تحديد شركة
    IF company_id_param IS NULL THEN
        company_id_param := user_company_id;
    END IF;

    -- التحقق من وجود الشركة
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'معرف الشركة مطلوب';
    END IF;

    RETURN QUERY
    WITH stats AS (
        SELECT 
            -- عدد المركبات
            (SELECT COUNT(*)::integer FROM public.vehicles 
             WHERE company_id = company_id_param AND is_active = true) as vehicles_count,
            
            -- عدد العقود النشطة
            (SELECT COUNT(*)::integer FROM public.contracts 
             WHERE company_id = company_id_param AND status = 'active') as contracts_count,
            
            -- عدد العملاء
            (SELECT COUNT(*)::integer FROM public.customers 
             WHERE company_id = company_id_param AND is_active = true) as customers_count,
            
            -- عدد الموظفين
            (SELECT COUNT(*)::integer FROM public.employees 
             WHERE company_id = company_id_param AND is_active = true) as employees_count,
            
            -- الإيرادات الشهرية
            (SELECT COALESCE(SUM(monthly_amount), 0) FROM public.contracts 
             WHERE company_id = company_id_param AND status = 'active') as monthly_rev,
            
            -- إجمالي الإيرادات
            (SELECT COALESCE(SUM(contract_amount), 0) FROM public.contracts 
             WHERE company_id = company_id_param AND status = 'active') as total_rev,
            
            -- طلبات الصيانة
            (SELECT COUNT(*)::integer FROM public.vehicle_maintenance 
             WHERE company_id = company_id_param AND status IN ('pending', 'in_progress')) as maintenance_count,
            
            -- المدفوعات المعلقة
            (SELECT COALESCE(SUM(amount), 0) FROM public.payments 
             WHERE company_id = company_id_param AND payment_status = 'pending') as pending_pay,
            
            -- العقود المنتهية الصلاحية قريباً (خلال شهر)
            (SELECT COUNT(*)::integer FROM public.contracts 
             WHERE company_id = company_id_param AND status = 'active' 
             AND end_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_count
    )
    SELECT 
        s.vehicles_count,
        '+0%'::text,
        s.contracts_count,
        '+0%'::text,
        s.customers_count,
        '+0%'::text,
        s.employees_count,
        '+0%'::text,
        s.monthly_rev,
        '+0%'::text,
        s.total_rev,
        s.maintenance_count,
        s.pending_pay,
        s.expiring_count,
        -- معدل استخدام الأسطول
        CASE 
            WHEN s.vehicles_count > 0 THEN ROUND((s.contracts_count::numeric / s.vehicles_count::numeric) * 100, 2)
            ELSE 0
        END as fleet_util,
        -- متوسط قيمة العقد
        CASE 
            WHEN s.contracts_count > 0 THEN ROUND(s.total_rev / s.contracts_count, 2)
            ELSE 0
        END as avg_contract,
        -- التدفق النقدي المقدر
        (s.monthly_rev - (s.employees_count * 500)) as cash_flow_est,
        -- هامش الربح المقدر
        CASE 
            WHEN s.monthly_rev > 0 THEN ROUND(((s.monthly_rev - (s.employees_count * 500)) / s.monthly_rev) * 100, 2)
            ELSE 0
        END as profit_margin_est
    FROM stats s;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ في الحصول على إحصائيات اللوحة: %', SQLERRM;
END;
$$;