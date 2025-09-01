-- Drop and recreate functions to fix ambiguous column references

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_user_company_cached(uuid);
DROP FUNCTION IF EXISTS public.has_role_cached(uuid, user_role);
DROP FUNCTION IF EXISTS public.get_dashboard_stats_safe(uuid);

-- 1. Recreate get_user_company_cached function with fixed column references
CREATE OR REPLACE FUNCTION public.get_user_company_cached(user_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    company_id_result uuid;
BEGIN
    -- Check profiles table first
    SELECT p.company_id INTO company_id_result
    FROM public.profiles p
    WHERE p.user_id = user_id_param
    LIMIT 1;
    
    -- If not found in profiles, check employees table
    IF company_id_result IS NULL THEN
        SELECT e.company_id INTO company_id_result
        FROM public.employees e
        WHERE e.user_id = user_id_param
        LIMIT 1;
    END IF;
    
    RETURN company_id_result;
END;
$$;

-- 2. Recreate has_role_cached function with fixed column references
CREATE OR REPLACE FUNCTION public.has_role_cached(user_id_param uuid, role_param user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        WHERE ur.user_id = user_id_param 
        AND ur.role = role_param
    );
END;
$$;

-- 3. Recreate improved dashboard stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe(company_id_param uuid DEFAULT NULL)
RETURNS TABLE(
    total_vehicles bigint,
    vehicles_change text,
    total_customers bigint,
    customers_change text,
    active_contracts bigint,
    contracts_change text,
    total_employees bigint,
    monthly_revenue numeric,
    revenue_change text,
    total_revenue numeric,
    maintenance_requests bigint,
    pending_payments numeric,
    expiring_contracts bigint,
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
    current_user_id uuid;
    user_company_id uuid;
    target_company_id uuid;
    is_super_admin boolean := false;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'غير مسموح: يجب تسجيل الدخول أولاً';
    END IF;
    
    -- Check if user is super admin
    is_super_admin := public.has_role_cached(current_user_id, 'super_admin'::user_role);
    
    -- Determine target company
    IF company_id_param IS NOT NULL THEN
        target_company_id := company_id_param;
    ELSE
        user_company_id := public.get_user_company_cached(current_user_id);
        target_company_id := user_company_id;
    END IF;
    
    -- Security check: non-super admins can only access their own company
    IF NOT is_super_admin AND target_company_id IS NOT NULL THEN
        user_company_id := public.get_user_company_cached(current_user_id);
        IF user_company_id IS NULL OR target_company_id != user_company_id THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكن الوصول لبيانات شركة أخرى';
        END IF;
    END IF;
    
    -- Return stats with proper error handling
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM public.vehicles v WHERE (target_company_id IS NULL OR v.company_id = target_company_id) AND v.is_active = true), 0)::bigint as total_vehicles,
        '+0%'::text as vehicles_change,
        COALESCE((SELECT COUNT(*) FROM public.customers c WHERE (target_company_id IS NULL OR c.company_id = target_company_id) AND c.is_active = true), 0)::bigint as total_customers,
        '+0%'::text as customers_change,
        COALESCE((SELECT COUNT(*) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active'), 0)::bigint as active_contracts,
        '+0%'::text as contracts_change,
        COALESCE((SELECT COUNT(*) FROM public.employees emp WHERE (target_company_id IS NULL OR emp.company_id = target_company_id) AND emp.is_active = true), 0)::bigint as total_employees,
        COALESCE((SELECT SUM(con.monthly_amount) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active'), 0)::numeric as monthly_revenue,
        '+0%'::text as revenue_change,
        COALESCE((SELECT SUM(con.contract_amount) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active'), 0)::numeric as total_revenue,
        COALESCE((SELECT COUNT(*) FROM public.vehicle_maintenance vm WHERE (target_company_id IS NULL OR vm.company_id = target_company_id) AND vm.status IN ('pending', 'in_progress')), 0)::bigint as maintenance_requests,
        COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE (target_company_id IS NULL OR p.company_id = target_company_id) AND p.payment_status = 'pending'), 0)::numeric as pending_payments,
        COALESCE((SELECT COUNT(*) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active' AND con.end_date <= CURRENT_DATE + INTERVAL '30 days'), 0)::bigint as expiring_contracts,
        COALESCE(
            CASE 
                WHEN (SELECT COUNT(*) FROM public.vehicles v WHERE (target_company_id IS NULL OR v.company_id = target_company_id) AND v.is_active = true) > 0 
                THEN ((SELECT COUNT(*) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active')::numeric / 
                      (SELECT COUNT(*) FROM public.vehicles v WHERE (target_company_id IS NULL OR v.company_id = target_company_id) AND v.is_active = true)::numeric) * 100
                ELSE 0
            END, 0
        )::numeric as fleet_utilization,
        COALESCE(
            CASE 
                WHEN (SELECT COUNT(*) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active') > 0 
                THEN (SELECT SUM(con.contract_amount) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active') / 
                     (SELECT COUNT(*) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active')::numeric
                ELSE 0
            END, 0
        )::numeric as avg_contract_value,
        COALESCE(
            (SELECT SUM(con.monthly_amount) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active') - 
            ((SELECT COUNT(*) FROM public.employees emp WHERE (target_company_id IS NULL OR emp.company_id = target_company_id) AND emp.is_active = true) * 500), 0
        )::numeric as cash_flow,
        COALESCE(
            CASE 
                WHEN (SELECT SUM(con.monthly_amount) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active') > 0 
                THEN (((SELECT SUM(con.monthly_amount) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active') - 
                       ((SELECT COUNT(*) FROM public.employees emp WHERE (target_company_id IS NULL OR emp.company_id = target_company_id) AND emp.is_active = true) * 500)) / 
                      (SELECT SUM(con.monthly_amount) FROM public.contracts con WHERE (target_company_id IS NULL OR con.company_id = target_company_id) AND con.status = 'active')) * 100
                ELSE 0
            END, 0
        )::numeric as profit_margin;
END;
$$;