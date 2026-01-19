-- Migration: Outstanding Balance Tracking System
-- Date: 2025-10-14
-- Description: Add contract tracking fields and calculate outstanding balance for rental payments

-- ===============================
-- Add Contract Tracking Fields to rental_payment_receipts
-- ===============================

-- Add contract reference and tracking fields
ALTER TABLE public.rental_payment_receipts
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS month_number INTEGER CHECK (month_number >= 1), -- Month number in contract (1, 2, 3...)
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

-- Index for contract queries
CREATE INDEX IF NOT EXISTS idx_rental_receipts_contract_id 
ON public.rental_payment_receipts(contract_id);

-- ===============================
-- Function: Calculate Outstanding Balance for Customer
-- ===============================

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
    v_months_paid INTEGER;
    v_total_paid NUMERIC;
    v_expected_total NUMERIC;
    v_last_payment DATE;
BEGIN
    -- Get active contract details for the customer
    SELECT 
        c.start_date,
        c.end_date,
        c.monthly_payment
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
    
    -- If no active contract found, return zeros
    IF v_contract_start IS NULL THEN
        RETURN QUERY
        SELECT 
            0::NUMERIC as expected_total,
            0::NUMERIC as total_paid,
            0::NUMERIC as outstanding_balance,
            0::INTEGER as months_expected,
            0::INTEGER as months_paid,
            0::INTEGER as unpaid_month_count,
            NULL::DATE as last_payment_date,
            NULL::DATE as contract_start_date,
            NULL::DATE as contract_end_date,
            0::NUMERIC as monthly_rent;
        RETURN;
    END IF;
    
    -- Calculate months expected (from contract start to now or contract end, whichever is earlier)
    v_months_expected := LEAST(
        EXTRACT(YEAR FROM AGE(COALESCE(v_contract_end, CURRENT_DATE), v_contract_start)) * 12 +
        EXTRACT(MONTH FROM AGE(COALESCE(v_contract_end, CURRENT_DATE), v_contract_start)) + 1,
        EXTRACT(YEAR FROM AGE(v_contract_end, v_contract_start)) * 12 +
        EXTRACT(MONTH FROM AGE(v_contract_end, v_contract_start)) + 1
    )::INTEGER;
    
    -- Ensure at least 1 month if contract has started
    IF v_months_expected < 1 THEN
        v_months_expected := 1;
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
$$ LANGUAGE plpgsql STABLE;

-- ===============================
-- Function: Get Unpaid Months List for Customer
-- ===============================

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
BEGIN
    -- Get active contract details
    SELECT 
        c.start_date,
        c.end_date,
        c.monthly_payment
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
    
    -- Loop through each month from contract start to now or contract end
    v_month_counter := 1;
    v_current_month_date := v_contract_start;
    
    WHILE v_current_month_date <= COALESCE(v_contract_end, CURRENT_DATE) 
    AND v_current_month_date <= CURRENT_DATE LOOP
        
        -- Generate month name in Arabic
        v_month_name := TO_CHAR(v_current_month_date, 'TMMonth YYYY');
        
        -- Check if this month has been paid
        SELECT EXISTS(
            SELECT 1
            FROM public.rental_payment_receipts
            WHERE customer_id = customer_id_param
            AND company_id = company_id_param
            AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM v_current_month_date)
            AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM v_current_month_date)
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
                    THEN EXTRACT(DAY FROM (CURRENT_DATE - v_current_month_date))::INTEGER
                    ELSE 0
                END as days_overdue;
        END IF;
        
        -- Move to next month
        v_month_counter := v_month_counter + 1;
        v_current_month_date := v_current_month_date + INTERVAL '1 month';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===============================
-- Function: Get All Customers with Outstanding Balance
-- ===============================

CREATE OR REPLACE FUNCTION public.get_all_customers_outstanding_balance(
    company_id_param UUID
)
RETURNS TABLE(
    customer_id UUID,
    customer_name TEXT,
    expected_total NUMERIC,
    total_paid NUMERIC,
    outstanding_balance NUMERIC,
    months_expected INTEGER,
    months_paid INTEGER,
    unpaid_month_count INTEGER,
    last_payment_date DATE,
    monthly_rent NUMERIC,
    payment_status TEXT -- 'current', 'late', 'overdue'
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as customer_id,
        CASE 
            WHEN c.customer_type = 'individual' 
            THEN c.first_name || ' ' || c.last_name
            ELSE c.company_name
        END as customer_name,
        ob.expected_total,
        ob.total_paid,
        ob.outstanding_balance,
        ob.months_expected,
        ob.months_paid,
        ob.unpaid_month_count,
        ob.last_payment_date,
        ob.monthly_rent,
        CASE 
            WHEN ob.unpaid_month_count = 0 THEN 'current'
            WHEN ob.unpaid_month_count <= 1 THEN 'late'
            ELSE 'overdue'
        END as payment_status
    FROM public.customers c
    CROSS JOIN LATERAL public.get_customer_outstanding_balance(c.id, company_id_param) ob
    WHERE c.company_id = company_id_param
    AND c.is_active = true
    AND EXISTS (
        SELECT 1 
        FROM public.contracts ct 
        WHERE ct.customer_id = c.id 
        AND ct.status = 'active'
    )
    ORDER BY ob.unpaid_month_count DESC, ob.outstanding_balance DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===============================
-- Update existing trigger to mark late payments
-- ===============================

CREATE OR REPLACE FUNCTION public.mark_late_rental_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as late if payment date is after the 1st of the month
    NEW.is_late := (EXTRACT(DAY FROM NEW.payment_date) > 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rental_payment_late_marker ON public.rental_payment_receipts;

CREATE TRIGGER rental_payment_late_marker
    BEFORE INSERT OR UPDATE ON public.rental_payment_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_late_rental_payment();

-- ===============================
-- Comments
-- ===============================

COMMENT ON COLUMN public.rental_payment_receipts.contract_id IS 'Reference to the contract this payment belongs to';
COMMENT ON COLUMN public.rental_payment_receipts.month_number IS 'Sequential month number in the contract (1, 2, 3...)';
COMMENT ON COLUMN public.rental_payment_receipts.is_late IS 'Whether payment was made after the due date (1st of month)';

COMMENT ON FUNCTION public.get_customer_outstanding_balance IS 'Calculate outstanding balance for a customer based on active contract';
COMMENT ON FUNCTION public.get_customer_unpaid_months IS 'Get list of unpaid months for a customer';
COMMENT ON FUNCTION public.get_all_customers_outstanding_balance IS 'Get outstanding balance summary for all active customers in company';
