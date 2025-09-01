-- Fix ambiguous user_id column references in database functions
-- and improve session handling

-- 1. Fix get_user_company_cached function to handle ambiguous columns
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

-- 2. Fix has_role_cached function to handle ambiguous columns
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

-- 3. Create improved dashboard stats function with better error handling
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
    
    -- Return stats (allow NULL company_id for super admins to get system-wide stats)
    RETURN QUERY
    WITH company_filter AS (
        SELECT target_company_id as filter_company_id
    ),
    vehicle_stats AS (
        SELECT 
            COUNT(*) as total_count
        FROM public.vehicles v, company_filter cf
        WHERE (cf.filter_company_id IS NULL OR v.company_id = cf.filter_company_id)
        AND v.is_active = true
    ),
    customer_stats AS (
        SELECT 
            COUNT(*) as total_count
        FROM public.customers c, company_filter cf
        WHERE (cf.filter_company_id IS NULL OR c.company_id = cf.filter_company_id)
        AND c.is_active = true
    ),
    contract_stats AS (
        SELECT 
            COUNT(*) as active_count,
            SUM(COALESCE(con.monthly_amount, 0)) as monthly_rev,
            SUM(COALESCE(con.contract_amount, 0)) as total_rev,
            COUNT(*) FILTER (WHERE con.end_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_count
        FROM public.contracts con, company_filter cf
        WHERE (cf.filter_company_id IS NULL OR con.company_id = cf.filter_company_id)
        AND con.status = 'active'
    ),
    employee_stats AS (
        SELECT 
            COUNT(*) as total_count
        FROM public.employees emp, company_filter cf
        WHERE (cf.filter_company_id IS NULL OR emp.company_id = cf.filter_company_id)
        AND emp.is_active = true
    ),
    maintenance_stats AS (
        SELECT 
            COUNT(*) as pending_count
        FROM public.vehicle_maintenance vm, company_filter cf
        WHERE (cf.filter_company_id IS NULL OR vm.company_id = cf.filter_company_id)
        AND vm.status IN ('pending', 'in_progress')
    ),
    payment_stats AS (
        SELECT 
            COALESCE(SUM(p.amount), 0) as pending_amount
        FROM public.payments p, company_filter cf
        WHERE (cf.filter_company_id IS NULL OR p.company_id = cf.filter_company_id)
        AND p.payment_status = 'pending'
    )
    SELECT 
        COALESCE(vs.total_count, 0) as total_vehicles,
        '+0%' as vehicles_change,
        COALESCE(cs.total_count, 0) as total_customers,
        '+0%' as customers_change,
        COALESCE(cons.active_count, 0) as active_contracts,
        '+0%' as contracts_change,
        COALESCE(es.total_count, 0) as total_employees,
        COALESCE(cons.monthly_rev, 0) as monthly_revenue,
        '+0%' as revenue_change,
        COALESCE(cons.total_rev, 0) as total_revenue,
        COALESCE(ms.pending_count, 0) as maintenance_requests,
        COALESCE(ps.pending_amount, 0) as pending_payments,
        COALESCE(cons.expiring_count, 0) as expiring_contracts,
        CASE 
            WHEN COALESCE(vs.total_count, 0) > 0 
            THEN (COALESCE(cons.active_count, 0)::numeric / vs.total_count::numeric) * 100
            ELSE 0
        END as fleet_utilization,
        CASE 
            WHEN COALESCE(cons.active_count, 0) > 0 
            THEN COALESCE(cons.total_rev, 0) / cons.active_count::numeric
            ELSE 0
        END as avg_contract_value,
        COALESCE(cons.monthly_rev, 0) - (COALESCE(es.total_count, 0) * 500) as cash_flow,
        CASE 
            WHEN COALESCE(cons.monthly_rev, 0) > 0 
            THEN ((COALESCE(cons.monthly_rev, 0) - (COALESCE(es.total_count, 0) * 500)) / cons.monthly_rev) * 100
            ELSE 0
        END as profit_margin
    FROM vehicle_stats vs
    CROSS JOIN customer_stats cs
    CROSS JOIN contract_stats cons
    CROSS JOIN employee_stats es
    CROSS JOIN maintenance_stats ms
    CROSS JOIN payment_stats ps;
END;
$$;