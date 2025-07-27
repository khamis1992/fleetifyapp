-- Create function to calculate financial health score
CREATE OR REPLACE FUNCTION public.calculate_financial_health_score(company_id_param uuid)
RETURNS TABLE(
    profitability_score numeric,
    liquidity_score numeric,
    efficiency_score numeric,
    solvency_score numeric,
    overall_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_revenue numeric := 0;
    total_expenses numeric := 0;
    total_assets numeric := 0;
    total_liabilities numeric := 0;
    cash_balance numeric := 0;
    current_assets numeric := 0;
    current_liabilities numeric := 0;
    prof_score numeric := 0;
    liq_score numeric := 0;
    eff_score numeric := 0;
    solv_score numeric := 0;
BEGIN
    -- Calculate revenue (last 6 months)
    SELECT COALESCE(SUM(jel.credit_amount), 0) INTO total_revenue
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.company_id = company_id_param
    AND coa.account_type = 'revenue'
    AND je.entry_date >= CURRENT_DATE - INTERVAL '6 months'
    AND je.status = 'posted';
    
    -- Calculate expenses (last 6 months)
    SELECT COALESCE(SUM(jel.debit_amount), 0) INTO total_expenses
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.company_id = company_id_param
    AND coa.account_type = 'expenses'
    AND je.entry_date >= CURRENT_DATE - INTERVAL '6 months'
    AND je.status = 'posted';
    
    -- Calculate total assets
    SELECT COALESCE(SUM(current_balance), 0) INTO total_assets
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND is_active = true;
    
    -- Calculate total liabilities
    SELECT COALESCE(SUM(current_balance), 0) INTO total_liabilities
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'liabilities'
    AND is_active = true;
    
    -- Calculate cash balance
    SELECT COALESCE(SUM(current_balance), 0) INTO cash_balance
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true;
    
    -- Current assets (simplified: cash + receivables)
    SELECT COALESCE(SUM(current_balance), 0) INTO current_assets
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%' OR account_name ILIKE '%receivable%')
    AND is_active = true;
    
    -- Current liabilities (simplified: payables)
    SELECT COALESCE(SUM(current_balance), 0) INTO current_liabilities
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'liabilities'
    AND account_name ILIKE '%payable%'
    AND is_active = true;
    
    -- Calculate scores (0-100 scale)
    
    -- Profitability Score (based on profit margin)
    IF total_revenue > 0 THEN
        prof_score := LEAST(100, GREATEST(0, ((total_revenue - total_expenses) / total_revenue) * 100));
    END IF;
    
    -- Liquidity Score (based on current ratio)
    IF current_liabilities > 0 THEN
        liq_score := LEAST(100, GREATEST(0, (current_assets / current_liabilities) * 50));
    ELSE
        liq_score := 100; -- No current liabilities is good
    END IF;
    
    -- Efficiency Score (based on asset turnover)
    IF total_assets > 0 THEN
        eff_score := LEAST(100, GREATEST(0, (total_revenue / total_assets) * 25));
    END IF;
    
    -- Solvency Score (based on debt to assets ratio)
    IF total_assets > 0 THEN
        solv_score := LEAST(100, GREATEST(0, 100 - ((total_liabilities / total_assets) * 100)));
    ELSE
        solv_score := 100; -- No assets/liabilities
    END IF;
    
    RETURN QUERY SELECT
        prof_score as profitability_score,
        liq_score as liquidity_score,
        eff_score as efficiency_score,
        solv_score as solvency_score,
        (prof_score + liq_score + eff_score + solv_score) / 4 as overall_score;
END;
$function$;

-- Create function for automated budget variance alerts
CREATE OR REPLACE FUNCTION public.check_budget_variances(company_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    budget_item_record RECORD;
    actual_amount numeric;
    variance_percentage numeric;
    alert_message text;
BEGIN
    -- Check all active budget items for the company
    FOR budget_item_record IN 
        SELECT bi.*, b.budget_year, coa.account_name, coa.account_name_ar
        FROM public.budget_items bi
        JOIN public.budgets b ON bi.budget_id = b.id
        JOIN public.chart_of_accounts coa ON bi.account_id = coa.id
        WHERE b.company_id = company_id_param
        AND b.status = 'approved'
        AND bi.budgeted_amount > 0
    LOOP
        -- Calculate actual amount spent/earned for this account in current year
        SELECT COALESCE(
            CASE 
                WHEN (SELECT account_type FROM public.chart_of_accounts WHERE id = budget_item_record.account_id) = 'revenue' 
                THEN SUM(jel.credit_amount)
                ELSE SUM(jel.debit_amount)
            END, 0
        ) INTO actual_amount
        FROM public.journal_entry_lines jel
        JOIN public.journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = budget_item_record.account_id
        AND je.company_id = company_id_param
        AND EXTRACT(YEAR FROM je.entry_date) = budget_item_record.budget_year
        AND je.status = 'posted';
        
        -- Update budget item with actual amount
        UPDATE public.budget_items
        SET 
            actual_amount = actual_amount,
            variance_amount = actual_amount - budget_item_record.budgeted_amount,
            variance_percentage = CASE 
                WHEN budget_item_record.budgeted_amount > 0 
                THEN ((actual_amount - budget_item_record.budgeted_amount) / budget_item_record.budgeted_amount) * 100
                ELSE 0
            END,
            updated_at = now()
        WHERE id = budget_item_record.id;
        
        -- Calculate variance percentage for alerts
        IF budget_item_record.budgeted_amount > 0 THEN
            variance_percentage := ((actual_amount - budget_item_record.budgeted_amount) / budget_item_record.budgeted_amount) * 100;
        ELSE
            variance_percentage := 0;
        END IF;
        
        -- Create alert if variance exceeds threshold (80% for warning, 100% for critical)
        IF ABS(variance_percentage) >= 80 THEN
            -- Check if alert already exists for this period
            IF NOT EXISTS (
                SELECT 1 FROM public.budget_alerts 
                WHERE budget_item_id = budget_item_record.id
                AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            ) THEN
                -- Create alert message
                IF variance_percentage > 0 THEN
                    alert_message := 'Budget exceeded for ' || budget_item_record.account_name || ' by ' || ROUND(variance_percentage, 1) || '%';
                ELSE
                    alert_message := 'Budget underutilized for ' || budget_item_record.account_name || ' by ' || ROUND(ABS(variance_percentage), 1) || '%';
                END IF;
                
                -- Insert alert
                INSERT INTO public.budget_alerts (
                    id,
                    company_id,
                    budget_id,
                    budget_item_id,
                    alert_type,
                    current_percentage,
                    threshold_percentage,
                    message,
                    message_ar,
                    amount_exceeded
                ) VALUES (
                    gen_random_uuid(),
                    company_id_param,
                    budget_item_record.budget_id,
                    budget_item_record.id,
                    CASE WHEN ABS(variance_percentage) >= 100 THEN 'budget_exceeded' ELSE 'budget_warning' END,
                    ABS(variance_percentage),
                    100,
                    alert_message,
                    alert_message, -- TODO: Add Arabic translation
                    ABS(actual_amount - budget_item_record.budgeted_amount)
                );
            END IF;
        END IF;
    END LOOP;
END;
$function$;

-- Create function to generate cash flow analysis
CREATE OR REPLACE FUNCTION public.generate_cash_flow_analysis(
    company_id_param uuid, 
    start_date_param date DEFAULT NULL,
    end_date_param date DEFAULT NULL
)
RETURNS TABLE(
    total_inflow numeric,
    total_outflow numeric,
    net_cash_flow numeric,
    operating_cash_flow numeric,
    investing_cash_flow numeric,
    financing_cash_flow numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    start_date date;
    end_date date;
    inflow numeric := 0;
    outflow numeric := 0;
    operating_inflow numeric := 0;
    operating_outflow numeric := 0;
    investing_inflow numeric := 0;
    investing_outflow numeric := 0;
    financing_inflow numeric := 0;
    financing_outflow numeric := 0;
BEGIN
    -- Set default date range if not provided (last 6 months)
    IF start_date_param IS NULL THEN
        start_date := CURRENT_DATE - INTERVAL '6 months';
    ELSE
        start_date := start_date_param;
    END IF;
    
    IF end_date_param IS NULL THEN
        end_date := CURRENT_DATE;
    ELSE
        end_date := end_date_param;
    END IF;
    
    -- Calculate operating cash flows (from payments and bank transactions)
    SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'receipt' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'payment' THEN amount ELSE 0 END), 0)
    INTO operating_inflow, operating_outflow
    FROM public.payments
    WHERE company_id = company_id_param
    AND payment_date BETWEEN start_date AND end_date
    AND payment_status = 'completed';
    
    -- Add bank transaction flows
    SELECT 
        operating_inflow + COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0),
        operating_outflow + COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0)
    INTO operating_inflow, operating_outflow
    FROM public.bank_transactions
    WHERE company_id = company_id_param
    AND transaction_date BETWEEN start_date AND end_date
    AND status = 'completed';
    
    -- Calculate investing cash flows (asset purchases, disposals)
    SELECT 
        COALESCE(SUM(CASE WHEN disposal_amount IS NOT NULL THEN disposal_amount ELSE 0 END), 0),
        COALESCE(SUM(purchase_cost), 0)
    INTO investing_inflow, investing_outflow
    FROM public.fixed_assets
    WHERE company_id = company_id_param
    AND (
        (purchase_date BETWEEN start_date AND end_date) OR
        (disposal_date BETWEEN start_date AND end_date)
    );
    
    -- Add vehicle purchases to investing outflows
    SELECT 
        investing_outflow + COALESCE(SUM(purchase_cost), 0)
    INTO investing_outflow
    FROM public.vehicles
    WHERE company_id = company_id_param
    AND purchase_date BETWEEN start_date AND end_date
    AND purchase_cost IS NOT NULL;
    
    -- Calculate financing cash flows (loans, equity - simplified for now)
    financing_inflow := 0; -- TODO: Add loan/equity tracking
    financing_outflow := 0; -- TODO: Add loan payments, dividends
    
    -- Calculate totals
    inflow := operating_inflow + investing_inflow + financing_inflow;
    outflow := operating_outflow + investing_outflow + financing_outflow;
    
    RETURN QUERY SELECT
        inflow as total_inflow,
        outflow as total_outflow,
        (inflow - outflow) as net_cash_flow,
        (operating_inflow - operating_outflow) as operating_cash_flow,
        (investing_inflow - investing_outflow) as investing_cash_flow,
        (financing_inflow - financing_outflow) as financing_cash_flow;
END;
$function$;

-- Create function to generate monthly financial trends
CREATE OR REPLACE FUNCTION public.generate_monthly_trends(
    company_id_param uuid,
    months_back integer DEFAULT 6
)
RETURNS TABLE(
    month_year text,
    total_revenue numeric,
    total_expenses numeric,
    net_profit numeric,
    profit_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT 
            TO_CHAR(je.entry_date, 'YYYY-MM') as month_year,
            COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jel.credit_amount ELSE 0 END), 0) as revenue,
            COALESCE(SUM(CASE WHEN coa.account_type = 'expenses' THEN jel.debit_amount ELSE 0 END), 0) as expenses
        FROM public.journal_entries je
        JOIN public.journal_entry_lines jel ON je.id = jel.journal_entry_id
        JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
        WHERE je.company_id = company_id_param
        AND je.entry_date >= CURRENT_DATE - (months_back || ' months')::interval
        AND je.status = 'posted'
        AND coa.account_type IN ('revenue', 'expenses')
        GROUP BY TO_CHAR(je.entry_date, 'YYYY-MM')
    )
    SELECT 
        md.month_year,
        md.revenue as total_revenue,
        md.expenses as total_expenses,
        (md.revenue - md.expenses) as net_profit,
        CASE 
            WHEN md.revenue > 0 THEN ((md.revenue - md.expenses) / md.revenue) * 100
            ELSE 0
        END as profit_margin
    FROM monthly_data md
    ORDER BY md.month_year;
END;
$function$;

-- Create trigger to automatically check budget variances when journal entries are posted
CREATE OR REPLACE FUNCTION public.trigger_budget_variance_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only check when status changes to 'posted'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'posted') THEN
        -- Schedule budget variance check (async)
        PERFORM public.check_budget_variances(NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS journal_entry_budget_check ON public.journal_entries;
CREATE TRIGGER journal_entry_budget_check
    AFTER UPDATE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_budget_variance_check();