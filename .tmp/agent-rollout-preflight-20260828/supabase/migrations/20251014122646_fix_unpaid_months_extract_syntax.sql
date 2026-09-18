-- Fix EXTRACT syntax error in unpaid months function
-- The problem: EXTRACT doesn't work with comparison operators directly in WHILE loop

DROP FUNCTION IF EXISTS public.get_customer_unpaid_months(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_customer_unpaid_months(
    customer_id_param UUID,
    company_id_param UUID
)
RETURNS TABLE(
    month_number INTEGER,
    month_name TEXT,
    expected_date DATE,
    is_overdue BOOLEAN,
    days_overdue INTEGER
) AS $$
DECLARE
    v_contract_start DATE;
    v_contract_end DATE;
    v_monthly_payment NUMERIC;
    v_month_counter INTEGER;
    v_current_month_date DATE;
    v_month_name TEXT;
    v_is_paid BOOLEAN;
    v_end_comparison_date DATE;
BEGIN
    -- Get active contract details
    SELECT 
        c.start_date,
        c.end_date,
        c.monthly_amount
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
    
    -- If no contract, return empty
    IF v_contract_start IS NULL THEN
        RETURN;
    END IF;
    
    -- Set end comparison date (contract end or current date, whichever is earlier)
    v_end_comparison_date := COALESCE(v_contract_end, CURRENT_DATE);
    IF v_end_comparison_date > CURRENT_DATE THEN
        v_end_comparison_date := CURRENT_DATE;
    END IF;
    
    -- Loop through each month from contract start to end comparison date
    v_month_counter := 1;
    v_current_month_date := v_contract_start;
    
    -- Fixed: Use simple date comparison instead of EXTRACT in WHILE condition
    WHILE v_current_month_date <= v_end_comparison_date LOOP
        
        -- Generate month name
        v_month_name := TO_CHAR(v_current_month_date, 'TMMonth YYYY');
        
        -- Check if this month has been paid
        SELECT EXISTS(
            SELECT 1
            FROM public.rental_payment_receipts
            WHERE customer_id = customer_id_param
            AND company_id = company_id_param
            AND EXTRACT(YEAR FROM payment_date::DATE) = EXTRACT(YEAR FROM v_current_month_date)
            AND EXTRACT(MONTH FROM payment_date::DATE) = EXTRACT(MONTH FROM v_current_month_date)
        ) INTO v_is_paid;
        
        -- If not paid, return this month
        IF NOT v_is_paid THEN
            RETURN QUERY
            SELECT 
                v_month_counter as month_number,
                v_month_name as month_name,
                v_current_month_date as expected_date,
                (v_current_month_date < CURRENT_DATE) as is_overdue,
                CASE 
                    WHEN v_current_month_date < CURRENT_DATE 
                    THEN EXTRACT(DAY FROM AGE(CURRENT_DATE, v_current_month_date))::INTEGER
                    ELSE 0
                END as days_overdue;
        END IF;
        
        -- Move to next month
        v_month_counter := v_month_counter + 1;
        v_current_month_date := v_current_month_date + INTERVAL '1 month';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_customer_unpaid_months TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_customer_unpaid_months IS 'Returns list of unpaid rental months for a customer. Auto-updates when payments are added.';;
