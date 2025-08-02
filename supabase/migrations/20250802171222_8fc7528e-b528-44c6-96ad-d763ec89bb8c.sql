-- Phase 2: Advanced Financial Functions
-- Function to calculate customer outstanding balance
CREATE OR REPLACE FUNCTION public.calculate_customer_outstanding_balance(customer_id_param uuid, company_id_param uuid)
RETURNS TABLE(
    current_balance numeric,
    overdue_amount numeric,
    days_overdue integer,
    credit_available numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    total_invoiced numeric := 0;
    total_paid numeric := 0;
    oldest_unpaid_date date;
    customer_credit_limit numeric := 0;
BEGIN
    -- Get customer credit limit
    SELECT COALESCE(credit_limit, 0) INTO customer_credit_limit
    FROM public.customers
    WHERE id = customer_id_param;
    
    -- Calculate total invoiced amount
    SELECT COALESCE(SUM(total_amount), 0) INTO total_invoiced
    FROM public.invoices
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND status IN ('sent', 'overdue');
    
    -- Calculate total paid amount
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.payments
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND status = 'completed';
    
    -- Get oldest unpaid invoice date
    SELECT MIN(due_date) INTO oldest_unpaid_date
    FROM public.invoices
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND status IN ('sent', 'overdue')
    AND total_amount > COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE invoice_id = invoices.id AND status = 'completed'
    ), 0);
    
    RETURN QUERY SELECT
        (total_invoiced - total_paid) as current_balance,
        CASE 
            WHEN oldest_unpaid_date IS NOT NULL AND oldest_unpaid_date < CURRENT_DATE 
            THEN (total_invoiced - total_paid)
            ELSE 0
        END as overdue_amount,
        CASE 
            WHEN oldest_unpaid_date IS NOT NULL AND oldest_unpaid_date < CURRENT_DATE 
            THEN (CURRENT_DATE - oldest_unpaid_date)::integer
            ELSE 0
        END as days_overdue,
        GREATEST(customer_credit_limit - (total_invoiced - total_paid), 0) as credit_available;
END;
$$;

-- Function to update customer aging analysis
CREATE OR REPLACE FUNCTION public.update_customer_aging_analysis(customer_id_param uuid, company_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    current_amt numeric := 0;
    days_1_30_amt numeric := 0;
    days_31_60_amt numeric := 0;
    days_61_90_amt numeric := 0;
    days_91_120_amt numeric := 0;
    days_over_120_amt numeric := 0;
    total_outstanding_amt numeric := 0;
    invoice_rec record;
    days_overdue integer;
    outstanding_amount numeric;
BEGIN
    -- Calculate aging buckets
    FOR invoice_rec IN
        SELECT i.id, i.due_date, i.total_amount,
               COALESCE(SUM(p.amount), 0) as paid_amount
        FROM public.invoices i
        LEFT JOIN public.payments p ON i.id = p.invoice_id AND p.status = 'completed'
        WHERE i.customer_id = customer_id_param 
        AND i.company_id = company_id_param
        AND i.status IN ('sent', 'overdue')
        GROUP BY i.id, i.due_date, i.total_amount
        HAVING i.total_amount > COALESCE(SUM(p.amount), 0)
    LOOP
        outstanding_amount := invoice_rec.total_amount - invoice_rec.paid_amount;
        days_overdue := GREATEST(0, (CURRENT_DATE - invoice_rec.due_date)::integer);
        
        IF days_overdue = 0 THEN
            current_amt := current_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 1 AND 30 THEN
            days_1_30_amt := days_1_30_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 31 AND 60 THEN
            days_31_60_amt := days_31_60_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 61 AND 90 THEN
            days_61_90_amt := days_61_90_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 91 AND 120 THEN
            days_91_120_amt := days_91_120_amt + outstanding_amount;
        ELSE
            days_over_120_amt := days_over_120_amt + outstanding_amount;
        END IF;
        
        total_outstanding_amt := total_outstanding_amt + outstanding_amount;
    END LOOP;
    
    -- Insert or update aging analysis
    INSERT INTO public.customer_aging_analysis (
        company_id, customer_id, analysis_date,
        current_amount, days_1_30, days_31_60, days_61_90, days_91_120, days_over_120,
        total_outstanding
    ) VALUES (
        company_id_param, customer_id_param, CURRENT_DATE,
        current_amt, days_1_30_amt, days_31_60_amt, days_61_90_amt, days_91_120_amt, days_over_120_amt,
        total_outstanding_amt
    )
    ON CONFLICT (company_id, customer_id, analysis_date) 
    DO UPDATE SET
        current_amount = EXCLUDED.current_amount,
        days_1_30 = EXCLUDED.days_1_30,
        days_31_60 = EXCLUDED.days_31_60,
        days_61_90 = EXCLUDED.days_61_90,
        days_91_120 = EXCLUDED.days_91_120,
        days_over_120 = EXCLUDED.days_over_120,
        total_outstanding = EXCLUDED.total_outstanding;
END;
$$;

-- Function to check customer credit status
CREATE OR REPLACE FUNCTION public.check_customer_credit_status(customer_id_param uuid, company_id_param uuid)
RETURNS TABLE(
    credit_score integer,
    risk_level text,
    credit_available numeric,
    payment_history_score integer,
    can_extend_credit boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    balance_info record;
    payment_score integer := 0;
    calculated_score integer := 0;
    risk_assessment text := 'low';
    credit_limit numeric := 0;
    can_extend boolean := true;
BEGIN
    -- Get current balance information
    SELECT * INTO balance_info 
    FROM public.calculate_customer_outstanding_balance(customer_id_param, company_id_param);
    
    -- Get customer credit limit
    SELECT COALESCE(credit_limit, 0) INTO credit_limit
    FROM public.customers
    WHERE id = customer_id_param;
    
    -- Calculate payment history score (0-100)
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 50  -- No history = neutral
            WHEN AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) >= 0.9 THEN 100
            WHEN AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) >= 0.7 THEN 80
            WHEN AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) >= 0.5 THEN 60
            ELSE 30
        END INTO payment_score
    FROM public.payments
    WHERE customer_id = customer_id_param AND company_id = company_id_param;
    
    -- Calculate overall credit score
    calculated_score := GREATEST(0, LEAST(100, 
        payment_score - 
        (balance_info.days_overdue * 2) -  -- Reduce score for overdue days
        CASE WHEN balance_info.overdue_amount > 0 THEN 20 ELSE 0 END -- Penalty for overdue amount
    ));
    
    -- Determine risk level
    IF calculated_score >= 80 THEN
        risk_assessment := 'low';
    ELSIF calculated_score >= 60 THEN
        risk_assessment := 'medium';
    ELSE
        risk_assessment := 'high';
    END IF;
    
    -- Determine if can extend credit
    can_extend := (calculated_score >= 60 AND balance_info.overdue_amount = 0);
    
    RETURN QUERY SELECT
        calculated_score as credit_score,
        risk_assessment as risk_level,
        balance_info.credit_available as credit_available,
        payment_score as payment_history_score,
        can_extend as can_extend_credit;
END;
$$;

-- Function to generate customer statement data
CREATE OR REPLACE FUNCTION public.generate_customer_statement_data(customer_id_param uuid, company_id_param uuid, start_date_param date DEFAULT NULL, end_date_param date DEFAULT NULL)
RETURNS TABLE(
    statement_period text,
    opening_balance numeric,
    total_charges numeric,
    total_payments numeric,
    closing_balance numeric,
    transaction_count integer,
    overdue_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    period_start date;
    period_end date;
    opening_bal numeric := 0;
    charges numeric := 0;
    payments numeric := 0;
    closing_bal numeric := 0;
    txn_count integer := 0;
    overdue_amt numeric := 0;
BEGIN
    -- Set default date range if not provided
    period_start := COALESCE(start_date_param, DATE_TRUNC('month', CURRENT_DATE));
    period_end := COALESCE(end_date_param, CURRENT_DATE);
    
    -- Calculate opening balance (invoices before period start minus payments)
    SELECT 
        COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(p.amount), 0) INTO opening_bal
    FROM public.invoices i
    LEFT JOIN public.payments p ON i.id = p.invoice_id AND p.status = 'completed' AND p.payment_date < period_start
    WHERE i.customer_id = customer_id_param 
    AND i.company_id = company_id_param
    AND i.invoice_date < period_start;
    
    -- Calculate charges during period
    SELECT COALESCE(SUM(total_amount), 0) INTO charges
    FROM public.invoices
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND invoice_date BETWEEN period_start AND period_end;
    
    -- Calculate payments during period
    SELECT COALESCE(SUM(amount), 0) INTO payments
    FROM public.payments
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND payment_date BETWEEN period_start AND period_end
    AND status = 'completed';
    
    -- Calculate transaction count
    SELECT 
        (SELECT COUNT(*) FROM public.invoices WHERE customer_id = customer_id_param AND company_id = company_id_param AND invoice_date BETWEEN period_start AND period_end) +
        (SELECT COUNT(*) FROM public.payments WHERE customer_id = customer_id_param AND company_id = company_id_param AND payment_date BETWEEN period_start AND period_end AND status = 'completed')
    INTO txn_count;
    
    -- Calculate closing balance
    closing_bal := opening_bal + charges - payments;
    
    -- Calculate overdue amount
    SELECT COALESCE(overdue_amount, 0) INTO overdue_amt
    FROM public.calculate_customer_outstanding_balance(customer_id_param, company_id_param);
    
    RETURN QUERY SELECT
        period_start::text || ' to ' || period_end::text as statement_period,
        opening_bal as opening_balance,
        charges as total_charges,
        payments as total_payments,
        closing_bal as closing_balance,
        txn_count as transaction_count,
        overdue_amt as overdue_amount;
END;
$$;

-- Add unique constraint for aging analysis to prevent duplicates
ALTER TABLE public.customer_aging_analysis 
ADD CONSTRAINT unique_customer_aging_analysis 
UNIQUE (company_id, customer_id, analysis_date);