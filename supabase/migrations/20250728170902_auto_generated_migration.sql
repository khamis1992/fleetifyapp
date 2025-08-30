-- Phase 1A: Database Security Fixes and Basic Optimizations

-- 1. Fix security definer functions by setting proper search paths
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name user_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = $1 AND ur.role = $2
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN (
        SELECT company_id FROM public.profiles 
        WHERE profiles.user_id = $1 
        LIMIT 1
    );
END;
$$;

-- 2. Create optimized view for recent activities (addresses N+1 queries)
CREATE OR REPLACE VIEW public.recent_activities_optimized AS
SELECT 
    sl.id,
    sl.company_id,
    sl.user_id,
    sl.level,
    sl.category,
    sl.action,
    sl.resource_type,
    sl.resource_id,
    sl.message,
    sl.created_at,
    p.first_name,
    p.last_name,
    p.avatar_url
FROM public.system_logs sl
LEFT JOIN public.profiles p ON sl.user_id = p.user_id
WHERE sl.created_at >= NOW() - INTERVAL '30 days'
ORDER BY sl.created_at DESC;

-- 3. Create materialized view for dashboard stats (reduces computation)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.company_stats_cache AS
WITH vehicle_stats AS (
    SELECT 
        company_id,
        COUNT(*) FILTER (WHERE is_active = true) as total_vehicles,
        COUNT(*) FILTER (WHERE is_active = true AND status = 'available') as available_vehicles
    FROM public.vehicles 
    GROUP BY company_id
),
contract_stats AS (
    SELECT 
        company_id,
        COUNT(*) FILTER (WHERE status = 'active') as active_contracts,
        COALESCE(SUM(monthly_amount) FILTER (WHERE status = 'active'), 0) as monthly_revenue
    FROM public.contracts 
    GROUP BY company_id
),
customer_stats AS (
    SELECT 
        company_id,
        COUNT(*) FILTER (WHERE is_active = true) as total_customers
    FROM public.customers 
    GROUP BY company_id
),
employee_stats AS (
    SELECT 
        company_id,
        COUNT(*) FILTER (WHERE is_active = true) as total_employees
    FROM public.employees 
    GROUP BY company_id
)
SELECT 
    c.id as company_id,
    COALESCE(vs.total_vehicles, 0) as total_vehicles,
    COALESCE(vs.available_vehicles, 0) as available_vehicles,
    COALESCE(cs.active_contracts, 0) as active_contracts,
    COALESCE(cs.monthly_revenue, 0) as monthly_revenue,
    COALESCE(cust.total_customers, 0) as total_customers,
    COALESCE(es.total_employees, 0) as total_employees,
    NOW() as last_updated
FROM public.companies c
LEFT JOIN vehicle_stats vs ON c.id = vs.company_id
LEFT JOIN contract_stats cs ON c.id = cs.company_id
LEFT JOIN customer_stats cust ON c.id = cust.company_id
LEFT JOIN employee_stats es ON c.id = es.company_id;

-- 4. Create function to refresh stats cache
CREATE OR REPLACE FUNCTION public.refresh_company_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.company_stats_cache;
END;
$$;