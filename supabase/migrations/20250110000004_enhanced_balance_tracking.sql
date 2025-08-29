-- تحسين نظام تتبع الأرصدة وربطه مع الالتزامات المالية الجديدة
-- Enhanced balance tracking system integrated with new financial obligations

-- Update customer_balances table to work with financial obligations
ALTER TABLE public.customer_balances ADD COLUMN IF NOT EXISTS total_obligations NUMERIC DEFAULT 0;
ALTER TABLE public.customer_balances ADD COLUMN IF NOT EXISTS paid_obligations NUMERIC DEFAULT 0;
ALTER TABLE public.customer_balances ADD COLUMN IF NOT EXISTS pending_obligations NUMERIC DEFAULT 0;

-- Enhanced function to calculate customer balance from financial obligations
CREATE OR REPLACE FUNCTION public.calculate_customer_balance_from_obligations(
    p_customer_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    total_obligations NUMERIC,
    paid_amount NUMERIC,
    pending_amount NUMERIC,
    overdue_amount NUMERIC,
    current_balance NUMERIC,
    days_overdue INTEGER,
    credit_available NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    customer_credit_limit NUMERIC := 0;
    oldest_overdue_date DATE;
BEGIN
    -- Get customer credit limit
    SELECT COALESCE(credit_limit, 0) INTO customer_credit_limit
    FROM public.customers
    WHERE id = p_customer_id AND company_id = p_company_id;
    
    -- Calculate totals from financial obligations
    SELECT 
        COALESCE(SUM(amount), 0) as total_obligations,
        COALESCE(SUM(paid_amount), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'partially_paid') THEN remaining_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status IN ('overdue', 'partially_paid') AND due_date < CURRENT_DATE THEN remaining_amount ELSE 0 END), 0) as overdue_amount,
        MIN(CASE WHEN status IN ('overdue', 'partially_paid') AND due_date < CURRENT_DATE THEN due_date END) as oldest_overdue_date
    INTO total_obligations, paid_amount, pending_amount, overdue_amount, oldest_overdue_date
    FROM public.financial_obligations
    WHERE customer_id = p_customer_id AND company_id = p_company_id;
    
    -- Set defaults if no data found
    total_obligations := COALESCE(total_obligations, 0);
    paid_amount := COALESCE(paid_amount, 0);
    pending_amount := COALESCE(pending_amount, 0);
    overdue_amount := COALESCE(overdue_amount, 0);
    
    RETURN QUERY SELECT
        total_obligations,
        paid_amount,
        pending_amount,
        overdue_amount,
        pending_amount as current_balance, -- Current balance is pending amount
        CASE 
            WHEN oldest_overdue_date IS NOT NULL 
            THEN (CURRENT_DATE - oldest_overdue_date)::INTEGER
            ELSE 0
        END as days_overdue,
        GREATEST(customer_credit_limit - pending_amount, 0) as credit_available;
END;
$$;

-- Enhanced function to update customer aging analysis using financial obligations
CREATE OR REPLACE FUNCTION public.update_customer_aging_from_obligations(
    p_customer_id UUID, 
    p_company_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    current_amt NUMERIC := 0;
    days_1_30_amt NUMERIC := 0;
    days_31_60_amt NUMERIC := 0;
    days_61_90_amt NUMERIC := 0;
    days_91_120_amt NUMERIC := 0;
    days_over_120_amt NUMERIC := 0;
    total_outstanding_amt NUMERIC := 0;
    obligation_rec RECORD;
    days_overdue INTEGER;
BEGIN
    -- Calculate aging buckets from financial obligations
    FOR obligation_rec IN
        SELECT id, due_date, remaining_amount, days_overdue
        FROM public.financial_obligations
        WHERE customer_id = p_customer_id 
        AND company_id = p_company_id
        AND status IN ('pending', 'overdue', 'partially_paid')
        AND remaining_amount > 0
    LOOP
        days_overdue := obligation_rec.days_overdue;
        
        IF days_overdue = 0 THEN
            current_amt := current_amt + obligation_rec.remaining_amount;
        ELSIF days_overdue BETWEEN 1 AND 30 THEN
            days_1_30_amt := days_1_30_amt + obligation_rec.remaining_amount;
        ELSIF days_overdue BETWEEN 31 AND 60 THEN
            days_31_60_amt := days_31_60_amt + obligation_rec.remaining_amount;
        ELSIF days_overdue BETWEEN 61 AND 90 THEN
            days_61_90_amt := days_61_90_amt + obligation_rec.remaining_amount;
        ELSIF days_overdue BETWEEN 91 AND 120 THEN
            days_91_120_amt := days_91_120_amt + obligation_rec.remaining_amount;
        ELSE
            days_over_120_amt := days_over_120_amt + obligation_rec.remaining_amount;
        END IF;
        
        total_outstanding_amt := total_outstanding_amt + obligation_rec.remaining_amount;
    END LOOP;
    
    -- Insert or update aging analysis
    INSERT INTO public.customer_aging_analysis (
        company_id, customer_id, analysis_date,
        current_amount, days_1_30, days_31_60, days_61_90, days_91_120, days_over_120,
        total_outstanding
    ) VALUES (
        p_company_id, p_customer_id, CURRENT_DATE,
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
        total_outstanding = EXCLUDED.total_outstanding,
        created_at = now();
END;
$$;

-- Function to update customer balance record
CREATE OR REPLACE FUNCTION public.update_customer_balance_record(
    p_customer_id UUID,
    p_company_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    balance_data RECORD;
    customer_data RECORD;
    last_payment_info RECORD;
BEGIN
    -- Get balance calculation
    SELECT * INTO balance_data
    FROM public.calculate_customer_balance_from_obligations(p_customer_id, p_company_id);
    
    -- Get customer data
    SELECT credit_limit INTO customer_data
    FROM public.customers
    WHERE id = p_customer_id AND company_id = p_company_id;
    
    -- Get last payment info
    SELECT 
        MAX(pa.allocation_date) as last_payment_date,
        SUM(pa.allocated_amount) as last_payment_amount
    INTO last_payment_info
    FROM public.payment_allocations pa
    JOIN public.financial_obligations fo ON pa.obligation_id = fo.id
    WHERE fo.customer_id = p_customer_id 
    AND fo.company_id = p_company_id
    AND pa.allocation_date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Insert or update customer balance
    INSERT INTO public.customer_balances (
        company_id, customer_id,
        current_balance, 
        last_payment_date, last_payment_amount,
        credit_limit, credit_used, credit_available,
        overdue_amount, days_overdue,
        total_obligations, paid_obligations, pending_obligations,
        updated_at
    ) VALUES (
        p_company_id, p_customer_id,
        balance_data.current_balance,
        last_payment_info.last_payment_date, COALESCE(last_payment_info.last_payment_amount, 0),
        COALESCE(customer_data.credit_limit, 0), balance_data.current_balance, balance_data.credit_available,
        balance_data.overdue_amount, balance_data.days_overdue,
        balance_data.total_obligations, balance_data.paid_amount, balance_data.pending_amount,
        now()
    )
    ON CONFLICT (company_id, customer_id)
    DO UPDATE SET
        current_balance = EXCLUDED.current_balance,
        last_payment_date = EXCLUDED.last_payment_date,
        last_payment_amount = EXCLUDED.last_payment_amount,
        credit_limit = EXCLUDED.credit_limit,
        credit_used = EXCLUDED.credit_used,
        credit_available = EXCLUDED.credit_available,
        overdue_amount = EXCLUDED.overdue_amount,
        days_overdue = EXCLUDED.days_overdue,
        total_obligations = EXCLUDED.total_obligations,
        paid_obligations = EXCLUDED.paid_obligations,
        pending_obligations = EXCLUDED.pending_obligations,
        updated_at = now();
        
    -- Also update aging analysis
    PERFORM public.update_customer_aging_from_obligations(p_customer_id, p_company_id);
END;
$$;

-- Trigger to update customer balance when financial obligations change
CREATE OR REPLACE FUNCTION public.trigger_update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance for the affected customer
    IF TG_OP = 'DELETE' THEN
        PERFORM public.update_customer_balance_record(OLD.customer_id, OLD.company_id);
        RETURN OLD;
    ELSE
        PERFORM public.update_customer_balance_record(NEW.customer_id, NEW.company_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on financial obligations
DROP TRIGGER IF EXISTS trigger_update_customer_balance ON public.financial_obligations;
CREATE TRIGGER trigger_update_customer_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.financial_obligations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_customer_balance();

-- Trigger to update customer balance when payment allocations change
CREATE OR REPLACE FUNCTION public.trigger_update_balance_on_allocation()
RETURNS TRIGGER AS $$
DECLARE
    customer_info RECORD;
BEGIN
    -- Get customer info from the obligation
    IF TG_OP = 'DELETE' THEN
        SELECT fo.customer_id, fo.company_id INTO customer_info
        FROM public.financial_obligations fo
        WHERE fo.id = OLD.obligation_id;
        
        IF customer_info.customer_id IS NOT NULL THEN
            PERFORM public.update_customer_balance_record(customer_info.customer_id, customer_info.company_id);
        END IF;
        RETURN OLD;
    ELSE
        SELECT fo.customer_id, fo.company_id INTO customer_info
        FROM public.financial_obligations fo
        WHERE fo.id = NEW.obligation_id;
        
        IF customer_info.customer_id IS NOT NULL THEN
            PERFORM public.update_customer_balance_record(customer_info.customer_id, customer_info.company_id);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on payment allocations
DROP TRIGGER IF EXISTS trigger_update_balance_on_allocation ON public.payment_allocations;
CREATE TRIGGER trigger_update_balance_on_allocation
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_balance_on_allocation();

-- Function to refresh all customer balances for a company
CREATE OR REPLACE FUNCTION public.refresh_all_customer_balances(p_company_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    customer_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR customer_record IN
        SELECT DISTINCT customer_id
        FROM public.financial_obligations
        WHERE company_id = p_company_id
    LOOP
        PERFORM public.update_customer_balance_record(customer_record.customer_id, p_company_id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$;

-- Function to get comprehensive customer financial summary
CREATE OR REPLACE FUNCTION public.get_customer_financial_summary(
    p_customer_id UUID,
    p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    balance_info RECORD;
    aging_info RECORD;
    recent_payments JSONB;
    upcoming_obligations JSONB;
    result JSONB;
BEGIN
    -- Get balance information
    SELECT * INTO balance_info
    FROM public.calculate_customer_balance_from_obligations(p_customer_id, p_company_id);
    
    -- Get aging analysis
    SELECT * INTO aging_info
    FROM public.customer_aging_analysis
    WHERE customer_id = p_customer_id 
    AND company_id = p_company_id
    AND analysis_date = CURRENT_DATE;
    
    -- Get recent payments (last 5)
    SELECT jsonb_agg(
        jsonb_build_object(
            'allocation_id', pa.id,
            'amount', pa.allocated_amount,
            'date', pa.allocation_date,
            'obligation_type', fo.obligation_type,
            'payment_method', p.payment_method
        )
    ) INTO recent_payments
    FROM public.payment_allocations pa
    JOIN public.financial_obligations fo ON pa.obligation_id = fo.id
    LEFT JOIN public.payments p ON pa.payment_id = p.id
    WHERE fo.customer_id = p_customer_id 
    AND fo.company_id = p_company_id
    ORDER BY pa.allocation_date DESC
    LIMIT 5;
    
    -- Get upcoming obligations (next 30 days)
    SELECT jsonb_agg(
        jsonb_build_object(
            'obligation_id', fo.id,
            'type', fo.obligation_type,
            'amount', fo.remaining_amount,
            'due_date', fo.due_date,
            'description', fo.description
        )
    ) INTO upcoming_obligations
    FROM public.financial_obligations fo
    WHERE fo.customer_id = p_customer_id 
    AND fo.company_id = p_company_id
    AND fo.status IN ('pending', 'partially_paid')
    AND fo.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ORDER BY fo.due_date ASC;
    
    -- Build result
    result := jsonb_build_object(
        'balance_summary', jsonb_build_object(
            'total_obligations', balance_info.total_obligations,
            'paid_amount', balance_info.paid_amount,
            'pending_amount', balance_info.pending_amount,
            'overdue_amount', balance_info.overdue_amount,
            'current_balance', balance_info.current_balance,
            'days_overdue', balance_info.days_overdue,
            'credit_available', balance_info.credit_available
        ),
        'aging_analysis', CASE 
            WHEN aging_info.id IS NOT NULL THEN
                jsonb_build_object(
                    'current_amount', aging_info.current_amount,
                    'days_1_30', aging_info.days_1_30,
                    'days_31_60', aging_info.days_31_60,
                    'days_61_90', aging_info.days_61_90,
                    'days_91_120', aging_info.days_91_120,
                    'days_over_120', aging_info.days_over_120,
                    'total_outstanding', aging_info.total_outstanding
                )
            ELSE '{}'::jsonb
        END,
        'recent_payments', COALESCE(recent_payments, '[]'::jsonb),
        'upcoming_obligations', COALESCE(upcoming_obligations, '[]'::jsonb),
        'summary_date', CURRENT_DATE
    );
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.calculate_customer_balance_from_obligations IS 'حساب رصيد العميل من الالتزامات المالية الجديدة';
COMMENT ON FUNCTION public.update_customer_aging_from_obligations IS 'تحديث تحليل الأعمار من الالتزامات المالية';
COMMENT ON FUNCTION public.get_customer_financial_summary IS 'الحصول على ملخص مالي شامل للعميل';
