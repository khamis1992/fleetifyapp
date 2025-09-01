-- Fix the get_dashboard_stats_safe function to properly handle authentication and RLS
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe(p_company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    company_id_to_use uuid;
    vehicle_count integer := 0;
    contract_count integer := 0;
    customer_count integer := 0;
    employee_count integer := 0;
    revenue_amount numeric := 0;
    maintenance_count integer := 0;
    overdue_payments integer := 0;
    expiring_contracts integer := 0;
    result jsonb;
BEGIN
    -- Get company ID - either from parameter or current user
    IF p_company_id IS NOT NULL THEN
        company_id_to_use := p_company_id;
    ELSE
        -- Get company from current user's profile
        SELECT company_id INTO company_id_to_use
        FROM profiles 
        WHERE user_id = auth.uid();
        
        -- If no profile found, try to get from user metadata
        IF company_id_to_use IS NULL THEN
            SELECT COALESCE(
                (auth.jwt()->>'company_id')::uuid,
                (raw_user_meta_data->>'company_id')::uuid
            ) INTO company_id_to_use
            FROM auth.users 
            WHERE id = auth.uid();
        END IF;
    END IF;
    
    -- If still no company ID, return empty stats
    IF company_id_to_use IS NULL THEN
        RETURN jsonb_build_object(
            'total_vehicles', 0,
            'active_contracts', 0,
            'total_customers', 0,
            'total_employees', 0,
            'monthly_revenue', 0,
            'pending_maintenance', 0,
            'overdue_payments', 0,
            'expiring_contracts', 0,
            'error', 'No company found for user'
        );
    END IF;
    
    -- Count vehicles
    SELECT COUNT(*) INTO vehicle_count
    FROM vehicles 
    WHERE company_id = company_id_to_use 
    AND is_active = true;
    
    -- Count active contracts
    SELECT COUNT(*) INTO contract_count
    FROM contracts 
    WHERE company_id = company_id_to_use 
    AND status = 'active';
    
    -- Count customers
    SELECT COUNT(*) INTO customer_count
    FROM customers 
    WHERE company_id = company_id_to_use 
    AND is_active = true;
    
    -- Count employees
    SELECT COUNT(*) INTO employee_count
    FROM employees 
    WHERE company_id = company_id_to_use 
    AND is_active = true;
    
    -- Calculate monthly revenue (last 30 days)
    SELECT COALESCE(SUM(total_amount), 0) INTO revenue_amount
    FROM invoices 
    WHERE company_id = company_id_to_use 
    AND status = 'paid'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Count pending maintenance
    SELECT COUNT(*) INTO maintenance_count
    FROM vehicle_maintenance 
    WHERE vehicle_id IN (
        SELECT id FROM vehicles WHERE company_id = company_id_to_use
    )
    AND status = 'pending';
    
    -- Count overdue payments
    SELECT COUNT(*) INTO overdue_payments
    FROM invoices 
    WHERE company_id = company_id_to_use 
    AND status = 'overdue';
    
    -- Count expiring contracts (next 30 days)
    SELECT COUNT(*) INTO expiring_contracts
    FROM contracts 
    WHERE company_id = company_id_to_use 
    AND status = 'active'
    AND end_date <= CURRENT_DATE + INTERVAL '30 days';
    
    -- Build result
    result := jsonb_build_object(
        'total_vehicles', vehicle_count,
        'active_contracts', contract_count,
        'total_customers', customer_count,
        'total_employees', employee_count,
        'monthly_revenue', revenue_amount,
        'pending_maintenance', maintenance_count,
        'overdue_payments', overdue_payments,
        'expiring_contracts', expiring_contracts,
        'company_id', company_id_to_use,
        'success', true
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
        'total_vehicles', 0,
        'active_contracts', 0,
        'total_customers', 0,
        'total_employees', 0,
        'monthly_revenue', 0,
        'pending_maintenance', 0,
        'overdue_payments', 0,
        'expiring_contracts', 0,
        'error', SQLERRM,
        'success', false
    );
END;
$$;