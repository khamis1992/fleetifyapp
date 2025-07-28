-- Phase 1: Database Performance Optimizations

-- 1. Add missing indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_company_status ON contracts(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_customer_company ON contracts(customer_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_company_active ON employees(company_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active);

-- 2. Optimize journal entries queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, entry_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id, journal_entry_id);

-- 3. Improve attendance and HR queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, attendance_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_employee_period ON payroll_records(employee_id, pay_period_start);

-- 4. Optimize vehicle maintenance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_maintenance_vehicle_date ON vehicle_maintenance(vehicle_id, scheduled_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_maintenance_company_status ON vehicle_maintenance(company_id, status);

-- 5. Bank and financial transaction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bank_transactions_company_date ON bank_transactions(company_id, transaction_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_company_date ON payments(company_id, payment_date DESC);

-- 6. System logs and audit optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_logs_company_created ON system_logs(company_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);

-- 7. Contract and approval workflow indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_company_status ON approval_requests(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_steps_request_order ON approval_steps(request_id, step_order);

-- 8. Fix security definer functions by setting proper search paths
-- Update existing functions to have immutable search paths

-- Fix function search paths (addressing linter warnings)
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

-- 9. Create optimized view for recent activities (addresses N+1 queries)
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

-- 10. Create materialized view for dashboard stats (reduces computation)
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

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_stats_cache_company_id ON public.company_stats_cache(company_id);

-- 11. Create function to refresh stats cache
CREATE OR REPLACE FUNCTION public.refresh_company_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.company_stats_cache;
END;
$$;

-- 12. Create composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_complex_query ON contracts(company_id, status, start_date, end_date) WHERE status IN ('active', 'pending');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_maintenance_ready ON vehicles(company_id, status, last_service_date) WHERE is_active = true;

-- 13. Optimize RLS policies by creating supporting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_company ON profiles(user_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- 14. Create partial indexes for frequently filtered data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_logs_recent ON system_logs(company_id, created_at DESC) WHERE created_at >= NOW() - INTERVAL '90 days';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_recent ON audit_logs(company_id, created_at DESC) WHERE created_at >= NOW() - INTERVAL '90 days';

-- 15. Add table partitioning for large tables (system_logs)
-- First create a function to create monthly partitions
CREATE OR REPLACE FUNCTION public.create_monthly_partition(table_name text, start_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date);
END;
$$;