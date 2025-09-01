-- Fix ambiguous column references in auth functions
-- This migration addresses the core issue causing "user not authorized" errors

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS public.get_user_company_cached(uuid);
DROP FUNCTION IF EXISTS public.has_role_cached(uuid, user_role);
DROP FUNCTION IF EXISTS public.get_dashboard_stats_safe(uuid);

-- Create improved get_user_company_cached function with proper column qualification
CREATE OR REPLACE FUNCTION public.get_user_company_cached(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Try to get company_id from profiles table first (most direct)
    SELECT p.company_id INTO v_company_id
    FROM public.profiles p
    WHERE p.user_id = p_user_id
    AND p.company_id IS NOT NULL
    LIMIT 1;
    
    -- If not found in profiles, try employees table
    IF v_company_id IS NULL THEN
        SELECT e.company_id INTO v_company_id
        FROM public.employees e
        WHERE e.user_id = p_user_id
        AND e.company_id IS NOT NULL
        LIMIT 1;
    END IF;
    
    RETURN v_company_id;
END;
$$;

-- Create improved has_role_cached function with proper column qualification
CREATE OR REPLACE FUNCTION public.has_role_cached(p_user_id uuid, p_role user_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = p_user_id
        AND ur.role = p_role::text
    );
END;
$$;

-- Create improved get_dashboard_stats_safe function with better error handling
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe(p_company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_user_id uuid;
    v_is_super_admin boolean := false;
    v_stats jsonb := '{}';
    v_total_customers integer := 0;
    v_total_contracts integer := 0;
    v_active_contracts integer := 0;
    v_total_revenue numeric := 0;
    v_pending_payments numeric := 0;
    v_overdue_contracts integer := 0;
    v_vehicles_count integer := 0;
    v_recent_activity jsonb := '[]';
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Check if user is super admin
    IF v_user_id IS NOT NULL THEN
        v_is_super_admin := public.has_role_cached(v_user_id, 'super_admin');
    END IF;
    
    -- Determine company_id to use
    IF p_company_id IS NOT NULL THEN
        v_company_id := p_company_id;
    ELSIF v_user_id IS NOT NULL THEN
        v_company_id := public.get_user_company_cached(v_user_id);
    END IF;
    
    -- If no company_id found and not super admin, return empty stats
    IF v_company_id IS NULL AND NOT v_is_super_admin THEN
        RETURN jsonb_build_object(
            'totalCustomers', 0,
            'totalContracts', 0,
            'activeContracts', 0,
            'totalRevenue', 0,
            'pendingPayments', 0,
            'overdueContracts', 0,
            'vehiclesCount', 0,
            'recentActivity', '[]'::jsonb,
            'error', 'لا يمكن تحديد الشركة للمستخدم'
        );
    END IF;
    
    BEGIN
        -- Get customers count
        IF v_is_super_admin AND v_company_id IS NULL THEN
            SELECT COUNT(*) INTO v_total_customers FROM public.customers WHERE is_active = true;
        ELSE
            SELECT COUNT(*) INTO v_total_customers 
            FROM public.customers 
            WHERE company_id = v_company_id AND is_active = true;
        END IF;
        
        -- Get contracts statistics
        IF v_is_super_admin AND v_company_id IS NULL THEN
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'active' AND end_date < CURRENT_DATE) as overdue
            INTO v_total_contracts, v_active_contracts, v_overdue_contracts
            FROM public.contracts;
        ELSE
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'active' AND end_date < CURRENT_DATE) as overdue
            INTO v_total_contracts, v_active_contracts, v_overdue_contracts
            FROM public.contracts 
            WHERE company_id = v_company_id;
        END IF;
        
        -- Get revenue statistics
        IF v_is_super_admin AND v_company_id IS NULL THEN
            SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
            FROM public.invoices WHERE status = 'paid';
            
            SELECT COALESCE(SUM(total_amount), 0) INTO v_pending_payments
            FROM public.invoices WHERE status IN ('sent', 'overdue');
        ELSE
            SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
            FROM public.invoices 
            WHERE company_id = v_company_id AND status = 'paid';
            
            SELECT COALESCE(SUM(total_amount), 0) INTO v_pending_payments
            FROM public.invoices 
            WHERE company_id = v_company_id AND status IN ('sent', 'overdue');
        END IF;
        
        -- Get vehicles count
        IF v_is_super_admin AND v_company_id IS NULL THEN
            SELECT COUNT(*) INTO v_vehicles_count FROM public.vehicles WHERE is_active = true;
        ELSE
            SELECT COUNT(*) INTO v_vehicles_count 
            FROM public.vehicles 
            WHERE company_id = v_company_id AND is_active = true;
        END IF;
        
        -- Get recent activity (last 10 entries)
        IF v_is_super_admin AND v_company_id IS NULL THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', al.id,
                    'action', al.action,
                    'resource_type', al.resource_type,
                    'created_at', al.created_at
                ) ORDER BY al.created_at DESC
            ) INTO v_recent_activity
            FROM (
                SELECT id, action, resource_type, created_at
                FROM public.audit_logs
                ORDER BY created_at DESC
                LIMIT 10
            ) al;
        ELSE
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', al.id,
                    'action', al.action,
                    'resource_type', al.resource_type,
                    'created_at', al.created_at
                ) ORDER BY al.created_at DESC
            ) INTO v_recent_activity
            FROM (
                SELECT id, action, resource_type, created_at
                FROM public.audit_logs
                WHERE company_id = v_company_id
                ORDER BY created_at DESC
                LIMIT 10
            ) al;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error and return partial data
        RAISE NOTICE 'Error in get_dashboard_stats_safe: %', SQLERRM;
    END;
    
    -- Build final stats object
    v_stats := jsonb_build_object(
        'totalCustomers', COALESCE(v_total_customers, 0),
        'totalContracts', COALESCE(v_total_contracts, 0),
        'activeContracts', COALESCE(v_active_contracts, 0),
        'totalRevenue', COALESCE(v_total_revenue, 0),
        'pendingPayments', COALESCE(v_pending_payments, 0),
        'overdueContracts', COALESCE(v_overdue_contracts, 0),
        'vehiclesCount', COALESCE(v_vehicles_count, 0),
        'recentActivity', COALESCE(v_recent_activity, '[]'::jsonb),
        'companyId', v_company_id,
        'isSuperAdmin', v_is_super_admin
    );
    
    RETURN v_stats;
END;
$$;