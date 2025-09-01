-- Drop and recreate the get_dashboard_stats_safe function with proper authentication
DROP FUNCTION IF EXISTS public.get_dashboard_stats_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe(company_id_param uuid DEFAULT NULL)
RETURNS TABLE(
    total_vehicles integer,
    vehicles_change text,
    total_customers integer,
    customers_change text,
    active_contracts integer,
    contracts_change text,
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
    target_company_id uuid;
    user_company_id uuid;
    current_user_id uuid;
    is_super_admin boolean := false;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'غير مسموح: يجب تسجيل الدخول أولاً';
    END IF;
    
    -- Check if user is super admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = current_user_id 
        AND ur.role = 'super_admin'
    ) INTO is_super_admin;
    
    -- Get user's company ID from profile
    SELECT company_id INTO user_company_id
    FROM profiles 
    WHERE user_id = current_user_id;
    
    -- Determine target company
    IF company_id_param IS NULL THEN
        target_company_id := user_company_id;
    ELSE
        -- For super admins, allow any company
        -- For regular users, only allow their own company
        IF is_super_admin THEN
            target_company_id := company_id_param;
        ELSE
            IF company_id_param = user_company_id THEN
                target_company_id := company_id_param;
            ELSE
                RAISE EXCEPTION 'غير مسموح: لا يمكنك الوصول لبيانات هذه الشركة';
            END IF;
        END IF;
    END IF;
    
    -- Validate company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
        RAISE EXCEPTION 'الشركة غير موجودة';
    END IF;
    
    -- Return the dashboard stats for the target company
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*)::integer FROM vehicles WHERE company_id = target_company_id AND is_active = true), 0) as total_vehicles,
        '+0%'::text as vehicles_change,
        
        COALESCE((SELECT COUNT(*)::integer FROM customers WHERE company_id = target_company_id AND is_active = true), 0) as total_customers,
        '+0%'::text as customers_change,
        
        COALESCE((SELECT COUNT(*)::integer FROM contracts WHERE company_id = target_company_id AND status = 'active'), 0) as active_contracts,
        '+0%'::text as contracts_change,
        
        COALESCE((SELECT COUNT(*)::integer FROM employees WHERE company_id = target_company_id AND is_active = true), 0) as total_employees,
        '+0%'::text as employees_change,
        
        COALESCE((SELECT SUM(monthly_amount) FROM contracts WHERE company_id = target_company_id AND status = 'active'), 0) as monthly_revenue,
        '+0%'::text as revenue_change,
        
        COALESCE((SELECT SUM(contract_amount) FROM contracts WHERE company_id = target_company_id AND status = 'active'), 0) as total_revenue,
        
        COALESCE((SELECT COUNT(*)::integer FROM vehicle_maintenance WHERE company_id = target_company_id AND status IN ('pending', 'in_progress')), 0) as maintenance_requests,
        
        COALESCE((SELECT SUM(amount) FROM payments WHERE company_id = target_company_id AND payment_status = 'pending'), 0) as pending_payments,
        
        COALESCE((SELECT COUNT(*)::integer FROM contracts WHERE company_id = target_company_id AND status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '30 days'), 0) as expiring_contracts,
        
        -- Calculate fleet utilization (contracts/vehicles * 100)
        CASE 
            WHEN (SELECT COUNT(*) FROM vehicles WHERE company_id = target_company_id AND is_active = true) > 0 
            THEN (
                (SELECT COUNT(*)::numeric FROM contracts WHERE company_id = target_company_id AND status = 'active') / 
                (SELECT COUNT(*)::numeric FROM vehicles WHERE company_id = target_company_id AND is_active = true) * 100
            )
            ELSE 0 
        END as fleet_utilization,
        
        -- Calculate average contract value
        CASE 
            WHEN (SELECT COUNT(*) FROM contracts WHERE company_id = target_company_id AND status = 'active') > 0 
            THEN (
                (SELECT SUM(contract_amount) FROM contracts WHERE company_id = target_company_id AND status = 'active') / 
                (SELECT COUNT(*)::numeric FROM contracts WHERE company_id = target_company_id AND status = 'active')
            )
            ELSE 0 
        END as avg_contract_value,
        
        -- Simple cash flow calculation (monthly_revenue - estimated_expenses)
        COALESCE((SELECT SUM(monthly_amount) FROM contracts WHERE company_id = target_company_id AND status = 'active'), 0) - 
        (COALESCE((SELECT COUNT(*) FROM employees WHERE company_id = target_company_id AND is_active = true), 0) * 500) as cash_flow,
        
        -- Simple profit margin calculation
        CASE 
            WHEN (SELECT SUM(monthly_amount) FROM contracts WHERE company_id = target_company_id AND status = 'active') > 0 
            THEN (
                ((SELECT SUM(monthly_amount) FROM contracts WHERE company_id = target_company_id AND status = 'active') - 
                 (SELECT COUNT(*) FROM employees WHERE company_id = target_company_id AND is_active = true) * 500) /
                (SELECT SUM(monthly_amount) FROM contracts WHERE company_id = target_company_id AND status = 'active') * 100
            )
            ELSE 0 
        END as profit_margin;
END;
$$;