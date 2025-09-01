-- Create the missing get_dashboard_stats_safe function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe(company_id_param uuid DEFAULT NULL)
RETURNS TABLE(
    total_vehicles integer,
    vehicles_change text,
    total_customers integer,
    customers_change text,
    active_contracts integer,
    contracts_change text,
    monthly_revenue numeric,
    revenue_change text,
    total_revenue numeric,
    total_contracts integer,
    total_employees integer,
    pending_maintenance integer,
    pending_payments integer,
    expiring_contracts integer,
    fleet_utilization numeric,
    avg_contract_value numeric,
    cash_flow numeric,
    profit_margin numeric,
    maintenance_requests integer,
    maintenance_change text,
    payments_change text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_company_id UUID;
    is_super_admin BOOLEAN := FALSE;
    stats_record RECORD;
BEGIN
    -- Get current user's company ID and role
    SELECT get_user_company(auth.uid()) INTO user_company_id;
    
    -- Check if user is super admin
    SELECT has_role(auth.uid(), 'super_admin'::user_role) INTO is_super_admin;
    
    -- Use provided company_id if user is super admin, otherwise use user's company
    IF company_id_param IS NOT NULL AND is_super_admin THEN
        user_company_id := company_id_param;
    END IF;
    
    -- If no company ID found, return empty stats
    IF user_company_id IS NULL THEN
        RETURN QUERY SELECT 
            0::integer, '+0%'::text, 0::integer, '+0%'::text,
            0::integer, '+0%'::text, 0::numeric, '+0%'::text,
            0::numeric, 0::integer, 0::integer, 0::integer,
            0::integer, 0::integer, 0::numeric, 0::numeric,
            0::numeric, 0::numeric, 0::integer, '+0%'::text, '+0%'::text;
        RETURN;
    END IF;
    
    -- Try to get from materialized view first
    SELECT * INTO stats_record
    FROM dashboard_stats_mv 
    WHERE company_id = user_company_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            COALESCE(stats_record.total_vehicles, 0)::integer,
            COALESCE(stats_record.vehicles_change, '+0%')::text,
            COALESCE(stats_record.total_customers, 0)::integer,
            COALESCE(stats_record.customers_change, '+0%')::text,
            COALESCE(stats_record.active_contracts, 0)::integer,
            COALESCE(stats_record.contracts_change, '+0%')::text,
            COALESCE(stats_record.monthly_revenue, 0)::numeric,
            COALESCE(stats_record.revenue_change, '+0%')::text,
            COALESCE(stats_record.total_revenue, 0)::numeric,
            COALESCE(stats_record.total_contracts, 0)::integer,
            COALESCE(stats_record.total_employees, 0)::integer,
            COALESCE(stats_record.pending_maintenance, 0)::integer,
            COALESCE(stats_record.pending_payments, 0)::integer,
            COALESCE(stats_record.expiring_contracts, 0)::integer,
            COALESCE(stats_record.fleet_utilization, 0)::numeric,
            COALESCE(stats_record.avg_contract_value, 0)::numeric,
            COALESCE(stats_record.cash_flow, 0)::numeric,
            COALESCE(stats_record.profit_margin, 0)::numeric,
            COALESCE(stats_record.maintenance_requests, 0)::integer,
            COALESCE(stats_record.maintenance_change, '+0%')::text,
            COALESCE(stats_record.payments_change, '+0%')::text;
    ELSE
        -- Fallback to direct calculation if materialized view is empty
        DECLARE
            v_total_vehicles INTEGER := 0;
            v_total_customers INTEGER := 0;
            v_active_contracts INTEGER := 0;
            v_monthly_revenue NUMERIC := 0;
            v_total_revenue NUMERIC := 0;
            v_total_contracts INTEGER := 0;
            v_total_employees INTEGER := 0;
            v_maintenance_requests INTEGER := 0;
        BEGIN
            -- Count vehicles
            SELECT COUNT(*) INTO v_total_vehicles
            FROM vehicles 
            WHERE company_id = user_company_id AND is_active = true;
            
            -- Count customers
            SELECT COUNT(*) INTO v_total_customers
            FROM customers 
            WHERE company_id = user_company_id AND is_active = true;
            
            -- Count active contracts
            SELECT COUNT(*) INTO v_active_contracts
            FROM contracts 
            WHERE company_id = user_company_id AND status = 'active';
            
            -- Count total contracts
            SELECT COUNT(*) INTO v_total_contracts
            FROM contracts 
            WHERE company_id = user_company_id;
            
            -- Count employees
            SELECT COUNT(*) INTO v_total_employees
            FROM employees 
            WHERE company_id = user_company_id AND is_active = true;
            
            -- Count maintenance requests
            SELECT COUNT(*) INTO v_maintenance_requests
            FROM maintenance_requests 
            WHERE vehicle_id IN (
                SELECT id FROM vehicles WHERE company_id = user_company_id
            ) AND status IN ('pending', 'in_progress');
            
            -- Calculate monthly revenue (current month)
            SELECT COALESCE(SUM(total_amount), 0) INTO v_monthly_revenue
            FROM invoices 
            WHERE company_id = user_company_id 
            AND status = 'paid'
            AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM invoice_date) = EXTRACT(MONTH FROM CURRENT_DATE);
            
            -- Calculate total revenue (this year)
            SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
            FROM invoices 
            WHERE company_id = user_company_id 
            AND status = 'paid'
            AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE);
            
            RETURN QUERY SELECT 
                v_total_vehicles, '+0%'::text,
                v_total_customers, '+0%'::text,
                v_active_contracts, '+0%'::text,
                v_monthly_revenue, '+0%'::text,
                v_total_revenue,
                v_total_contracts,
                v_total_employees,
                0::integer, -- pending_maintenance
                0::integer, -- pending_payments  
                0::integer, -- expiring_contracts
                0::numeric, -- fleet_utilization
                CASE WHEN v_active_contracts > 0 THEN v_total_revenue / v_active_contracts ELSE 0 END, -- avg_contract_value
                v_monthly_revenue, -- cash_flow (simplified)
                0::numeric, -- profit_margin
                v_maintenance_requests,
                '+0%'::text, -- maintenance_change
                '+0%'::text; -- payments_change
        END;
    END IF;
END;
$$;