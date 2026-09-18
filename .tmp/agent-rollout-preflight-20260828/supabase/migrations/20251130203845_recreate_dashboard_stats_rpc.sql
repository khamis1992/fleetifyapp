-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_dashboard_stats(UUID);

-- RPC Function: get_dashboard_stats
-- Optimized function to fetch all dashboard statistics in a single call

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_contracts INTEGER;
    v_active_contracts INTEGER;
    v_expiring_contracts INTEGER;
    v_total_customers INTEGER;
    v_active_customers INTEGER;
    v_total_vehicles INTEGER;
    v_available_vehicles INTEGER;
    v_rented_vehicles INTEGER;
    v_maintenance_vehicles INTEGER;
    v_total_revenue NUMERIC;
    v_monthly_revenue NUMERIC;
    v_pending_payments NUMERIC;
    v_overdue_payments NUMERIC;
    v_today DATE := CURRENT_DATE;
    v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_month_end DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
BEGIN
    -- === Contracts Stats ===
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status = 'active' AND end_date BETWEEN v_today AND v_today + INTERVAL '7 days')
    INTO v_total_contracts, v_active_contracts, v_expiring_contracts
    FROM contracts
    WHERE company_id = p_company_id;

    -- === Customers Stats ===
    SELECT 
        COUNT(*),
        COUNT(DISTINCT c.customer_id)
    INTO v_total_customers, v_active_customers
    FROM customers cu
    LEFT JOIN contracts c ON cu.id = c.customer_id AND c.status = 'active'
    WHERE cu.company_id = p_company_id;

    -- === Vehicles Stats ===
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'available'),
        COUNT(*) FILTER (WHERE status = 'rented'),
        COUNT(*) FILTER (WHERE status = 'maintenance')
    INTO v_total_vehicles, v_available_vehicles, v_rented_vehicles, v_maintenance_vehicles
    FROM vehicles
    WHERE company_id = p_company_id;

    -- === Revenue Stats ===
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_revenue
    FROM payments
    WHERE company_id = p_company_id
    AND status = 'completed';

    SELECT COALESCE(SUM(amount), 0)
    INTO v_monthly_revenue
    FROM payments
    WHERE company_id = p_company_id
    AND status = 'completed'
    AND payment_date >= v_month_start
    AND payment_date <= v_month_end;

    SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
    INTO v_pending_payments
    FROM invoices
    WHERE company_id = p_company_id
    AND status IN ('pending', 'partially_paid')
    AND due_date >= v_today;

    SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
    INTO v_overdue_payments
    FROM invoices
    WHERE company_id = p_company_id
    AND status IN ('pending', 'partially_paid', 'overdue')
    AND due_date < v_today;

    -- === Build Result JSON ===
    result := jsonb_build_object(
        'contracts', jsonb_build_object(
            'total', v_total_contracts,
            'active', v_active_contracts,
            'expiring_soon', v_expiring_contracts,
            'utilization_rate', CASE WHEN v_total_contracts > 0 
                THEN ROUND((v_active_contracts::NUMERIC / v_total_contracts) * 100, 1) 
                ELSE 0 END
        ),
        'customers', jsonb_build_object(
            'total', v_total_customers,
            'active', v_active_customers,
            'retention_rate', CASE WHEN v_total_customers > 0 
                THEN ROUND((v_active_customers::NUMERIC / v_total_customers) * 100, 1) 
                ELSE 0 END
        ),
        'vehicles', jsonb_build_object(
            'total', v_total_vehicles,
            'available', v_available_vehicles,
            'rented', v_rented_vehicles,
            'maintenance', v_maintenance_vehicles,
            'utilization_rate', CASE WHEN v_total_vehicles > 0 
                THEN ROUND((v_rented_vehicles::NUMERIC / v_total_vehicles) * 100, 1) 
                ELSE 0 END
        ),
        'revenue', jsonb_build_object(
            'total', v_total_revenue,
            'monthly', v_monthly_revenue,
            'pending', v_pending_payments,
            'overdue', v_overdue_payments
        ),
        'generated_at', NOW()
    );

    RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO service_role;;
