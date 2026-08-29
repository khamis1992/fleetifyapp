-- Dashboard Statistics Aggregation Function
-- CRITICAL FIX: Replace 8-10 parallel queries with single aggregated query

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_company_id UUID,
  p_include_vehicles BOOLEAN DEFAULT TRUE,
  p_include_properties BOOLEAN DEFAULT FALSE
) RETURNS JSON AS $$
DECLARE
  result JSON;
  v_total_vehicles INTEGER := 0;
  v_active_vehicles INTEGER := 0;
  v_available_vehicles INTEGER := 0;
  v_total_contracts INTEGER := 0;
  v_active_contracts INTEGER := 0;
  v_expiring_contracts INTEGER := 0;
  v_total_customers INTEGER := 0;
  v_active_customers INTEGER := 0;
  v_total_properties INTEGER := 0;
  v_expiry_date DATE;
BEGIN
  v_expiry_date := CURRENT_DATE + INTERVAL '30 days';

  IF p_include_vehicles THEN
    SELECT 
      COUNT(*) FILTER (WHERE is_active = true),
      COUNT(*) FILTER (WHERE is_active = true AND status = 'available'),
      COUNT(*)
    INTO 
      v_active_vehicles,
      v_available_vehicles,
      v_total_vehicles
    FROM vehicles
    WHERE company_id = p_company_id;
  END IF;

  SELECT 
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'active' AND end_date <= v_expiry_date),
    COUNT(*)
  INTO 
    v_active_contracts,
    v_expiring_contracts,
    v_total_contracts
  FROM contracts
  WHERE company_id = p_company_id;

  SELECT 
    COUNT(*) FILTER (WHERE is_active = true),
    COUNT(*)
  INTO 
    v_active_customers,
    v_total_customers
  FROM customers
  WHERE company_id = p_company_id;

  IF p_include_properties THEN
    SELECT COUNT(*)
    INTO v_total_properties
    FROM properties
    WHERE company_id = p_company_id;
  END IF;

  result := json_build_object(
    'totalVehicles', v_total_vehicles,
    'activeVehicles', v_active_vehicles,
    'availableVehicles', v_available_vehicles,
    'totalContracts', v_total_contracts,
    'activeContracts', v_active_contracts,
    'expiringContracts', v_expiring_contracts,
    'totalCustomers', v_total_customers,
    'activeCustomers', v_active_customers,
    'totalProperties', v_total_properties,
    'timestamp', EXTRACT(EPOCH FROM NOW())::BIGINT
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_monthly_revenue(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSON AS $$
DECLARE
  result JSON;
  v_payments_revenue NUMERIC := 0;
  v_invoices_revenue NUMERIC := 0;
  v_total_revenue NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_payments_revenue
  FROM payments
  WHERE company_id = p_company_id
    AND payment_status IN ('completed', 'paid', 'confirmed')
    AND payment_date >= p_start_date
    AND payment_date <= p_end_date;

  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_invoices_revenue
  FROM invoices
  WHERE company_id = p_company_id
    AND payment_status = 'paid'
    AND invoice_date >= p_start_date
    AND invoice_date <= p_end_date;

  v_total_revenue := CASE 
    WHEN v_payments_revenue > 0 THEN v_payments_revenue
    ELSE v_invoices_revenue
  END;

  result := json_build_object(
    'totalRevenue', v_total_revenue,
    'paymentsRevenue', v_payments_revenue,
    'invoicesRevenue', v_invoices_revenue,
    'startDate', p_start_date,
    'endDate', p_end_date,
    'timestamp', EXTRACT(EPOCH FROM NOW())::BIGINT
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;;
