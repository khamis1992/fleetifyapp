-- Fix for Outstanding Balance Function - Column name issue
-- The problem: using wrong column name 'monthly_payment' instead of 'monthly_amount'

DROP FUNCTION IF EXISTS public.get_customer_outstanding_balance(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_customer_outstanding_balance(
    customer_id_param UUID,
    company_id_param UUID
)
RETURNS TABLE(
    expected_total NUMERIC,
    total_paid NUMERIC,
    outstanding_balance NUMERIC,
    months_expected INTEGER,
    months_paid INTEGER,
    unpaid_month_count INTEGER,
    last_payment_date DATE,
    contract_start_date DATE,
    contract_end_date DATE,
    monthly_rent NUMERIC
) AS $$
DECLARE
    v_contract_start DATE;
    v_contract_end DATE;
    v_monthly_payment NUMERIC;
    v_months_expected INTEGER;
    v_expected_total NUMERIC;
    v_total_paid NUMERIC;
    v_months_paid INTEGER;
    v_last_payment DATE;
BEGIN
    -- Get active contract details
    -- ✅ FIXED: Changed from c.monthly_payment to c.monthly_amount
    SELECT 
        c.start_date,
        c.end_date,
        c.monthly_amount  -- ✅ Correct column name
    INTO 
        v_contract_start,
        v_contract_end,
        v_monthly_payment
    FROM public.contracts c
    WHERE c.customer_id = customer_id_param
    AND c.company_id = company_id_param
    AND c.status = 'active'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    -- If no contract, return zeros
    IF v_contract_start IS NULL THEN
        RETURN QUERY
        SELECT 
            0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
            0::INTEGER, 0::INTEGER, 0::INTEGER,
            NULL::DATE, NULL::DATE, NULL::DATE, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Calculate months expected (from contract start to now or contract end)
    IF v_contract_end IS NULL OR v_contract_end > CURRENT_DATE THEN
        v_months_expected := GREATEST(1, 
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_contract_start))::INTEGER + 1
        );
    ELSE
        v_months_expected := GREATEST(1,
            EXTRACT(MONTH FROM AGE(v_contract_end, v_contract_start))::INTEGER + 1
        );
    END IF;
    
    -- Calculate expected total
    v_expected_total := v_months_expected * v_monthly_payment;
    
    -- Get actual payments data
    SELECT 
        COUNT(DISTINCT month)::INTEGER,
        COALESCE(SUM(rent_amount), 0),
        MAX(payment_date)
    INTO 
        v_months_paid,
        v_total_paid,
        v_last_payment
    FROM public.rental_payment_receipts
    WHERE customer_id = customer_id_param
    AND company_id = company_id_param;
    
    -- Return calculated values
    RETURN QUERY
    SELECT 
        v_expected_total as expected_total,
        v_total_paid as total_paid,
        (v_expected_total - v_total_paid) as outstanding_balance,
        v_months_expected as months_expected,
        COALESCE(v_months_paid, 0) as months_paid,
        (v_months_expected - COALESCE(v_months_paid, 0)) as unpaid_month_count,
        v_last_payment as last_payment_date,
        v_contract_start as contract_start_date,
        v_contract_end as contract_end_date,
        v_monthly_payment as monthly_rent;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_customer_outstanding_balance TO authenticated;;
