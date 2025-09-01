-- Create a simpler safe function without materialized view for now
DROP FUNCTION IF EXISTS public.get_dashboard_stats_safe(uuid);

-- Create the safe dashboard stats function with basic counts only
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
    company_exists boolean;
    user_company_id uuid;
    v_total_vehicles bigint := 0;
    v_total_customers bigint := 0;
    v_active_contracts bigint := 0;
    v_total_employees bigint := 0;
    v_monthly_revenue numeric := 0;
    v_pending_maintenance bigint := 0;
    v_overdue_payments bigint := 0;
    v_expiring_contracts bigint := 0;
BEGIN
    -- Log function call
    RAISE NOTICE 'get_dashboard_stats_safe called with company_id: %', company_id_param;
    
    -- Validate input
    IF company_id_param IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب',
            'data', null
        );
    END IF;
    
    -- Check if company exists
    SELECT EXISTS(SELECT 1 FROM companies WHERE id = company_id_param) INTO company_exists;
    
    IF NOT company_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الشركة غير موجودة',
            'data', null
        );
    END IF;
    
    -- Get user's company for security check
    user_company_id := get_user_company(auth.uid());
    
    -- Security check: Allow super_admin or company match
    IF NOT (has_role(auth.uid(), 'super_admin'::user_role) OR user_company_id = company_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'غير مصرح لك بالوصول لبيانات هذه الشركة',
            'data', null
        );
    END IF;
    
    -- Get basic counts safely with error handling
    BEGIN
        SELECT COALESCE(COUNT(*), 0) INTO v_total_vehicles 
        FROM vehicles 
        WHERE company_id = company_id_param AND is_active = true;
    EXCEPTION WHEN OTHERS THEN
        v_total_vehicles := 0;
    END;
    
    BEGIN
        SELECT COALESCE(COUNT(*), 0) INTO v_total_customers 
        FROM customers 
        WHERE company_id = company_id_param AND is_active = true;
    EXCEPTION WHEN OTHERS THEN
        v_total_customers := 0;
    END;
    
    BEGIN
        SELECT COALESCE(COUNT(*), 0) INTO v_active_contracts 
        FROM contracts 
        WHERE company_id = company_id_param AND status = 'active';
    EXCEPTION WHEN OTHERS THEN
        v_active_contracts := 0;
    END;
    
    BEGIN
        SELECT COALESCE(COUNT(*), 0) INTO v_total_employees 
        FROM employees 
        WHERE company_id = company_id_param AND is_active = true;
    EXCEPTION WHEN OTHERS THEN
        v_total_employees := 0;
    END;
    
    BEGIN
        SELECT COALESCE(SUM(amount), 0) INTO v_monthly_revenue 
        FROM payments 
        WHERE company_id = company_id_param 
        AND payment_method = 'received' 
        AND payment_status = 'completed'
        AND payment_date >= CURRENT_DATE - INTERVAL '30 days';
    EXCEPTION WHEN OTHERS THEN
        v_monthly_revenue := 0;
    END;
    
    BEGIN
        SELECT COALESCE(COUNT(*), 0) INTO v_pending_maintenance 
        FROM vehicle_maintenance 
        WHERE company_id = company_id_param AND status = 'pending';
    EXCEPTION WHEN OTHERS THEN
        v_pending_maintenance := 0;
    END;
    
    BEGIN
        SELECT COALESCE(COUNT(*), 0) INTO v_overdue_payments 
        FROM payments 
        WHERE company_id = company_id_param 
        AND due_date < CURRENT_DATE 
        AND payment_status != 'completed';
    EXCEPTION WHEN OTHERS THEN
        v_overdue_payments := 0;
    END;
    
    BEGIN
        SELECT COALESCE(COUNT(*), 0) INTO v_expiring_contracts 
        FROM contracts 
        WHERE company_id = company_id_param 
        AND end_date <= CURRENT_DATE + INTERVAL '30 days' 
        AND status = 'active';
    EXCEPTION WHEN OTHERS THEN
        v_expiring_contracts := 0;
    END;
    
    -- Build result
    result := jsonb_build_object(
        'totalVehicles', v_total_vehicles,
        'totalCustomers', v_total_customers,
        'activeContracts', v_active_contracts,
        'totalEmployees', v_total_employees,
        'monthlyRevenue', v_monthly_revenue,
        'pendingMaintenance', v_pending_maintenance,
        'overduePayments', v_overdue_payments,
        'expiringContracts', v_expiring_contracts,
        'fleetUtilization', CASE 
            WHEN v_total_vehicles > 0 
            THEN ROUND((v_active_contracts::decimal / v_total_vehicles) * 100, 2)
            ELSE 0 
        END,
        'avgContractValue', 0,
        'cashFlow', v_monthly_revenue,
        'profitMargin', 0,
        'vehiclesChange', '+0%',
        'customersChange', '+0%',
        'contractsChange', '+0%',
        'revenueChange', '+0%',
        'lastUpdated', now()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'error', null,
        'data', result
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in get_dashboard_stats_safe: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في استرجاع بيانات لوحة المعلومات: ' || SQLERRM,
        'data', null
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_safe(uuid) TO authenticated;