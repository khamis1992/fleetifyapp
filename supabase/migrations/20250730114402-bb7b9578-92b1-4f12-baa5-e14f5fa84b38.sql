-- Fix ambiguous column references in all SQL functions

-- 1. Fix get_trial_balance function
CREATE OR REPLACE FUNCTION public.get_trial_balance(company_id_param uuid, as_of_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(account_id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, debit_balance numeric, credit_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id as account_id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.account_level,
        CASE 
            WHEN coa.balance_type = 'debit' AND 
                 (coa.current_balance + COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)) > 0
            THEN coa.current_balance + COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)
            WHEN coa.balance_type = 'credit' AND 
                 (coa.current_balance + COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)) < 0
            THEN ABS(coa.current_balance + COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0))
            ELSE 0
        END as debit_balance,
        CASE 
            WHEN coa.balance_type = 'credit' AND 
                 (coa.current_balance + COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)) > 0
            THEN coa.current_balance + COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)
            WHEN coa.balance_type = 'debit' AND 
                 (coa.current_balance + COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)) < 0
            THEN ABS(coa.current_balance + COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0))
            ELSE 0
        END as credit_balance
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_entry_lines jel ON coa.id = jel.account_id
    LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.company_id = company_id_param
        AND coa.is_active = true
        AND (je.entry_date <= as_of_date OR je.entry_date IS NULL)
        AND (je.status = 'posted' OR je.status IS NULL)
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_name_ar, 
             coa.account_type, coa.account_level, coa.balance_type, coa.current_balance
    ORDER BY coa.account_level, coa.account_code;
END;
$function$;

-- 2. Fix calculate_financial_health_score function
CREATE OR REPLACE FUNCTION public.calculate_financial_health_score(company_id_param uuid)
 RETURNS TABLE(profitability_score numeric, liquidity_score numeric, efficiency_score numeric, solvency_score numeric, overall_score numeric)
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
    SELECT COALESCE(SUM(coa.current_balance), 0) INTO total_assets
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND coa.is_active = true;
    
    -- Calculate total liabilities
    SELECT COALESCE(SUM(coa.current_balance), 0) INTO total_liabilities
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'liabilities'
    AND coa.is_active = true;
    
    -- Calculate cash balance
    SELECT COALESCE(SUM(coa.current_balance), 0) INTO cash_balance
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%cash%' OR coa.account_name ILIKE '%bank%')
    AND coa.is_active = true;
    
    -- Current assets (simplified: cash + receivables)
    SELECT COALESCE(SUM(coa.current_balance), 0) INTO current_assets
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%cash%' OR coa.account_name ILIKE '%bank%' OR coa.account_name ILIKE '%receivable%')
    AND coa.is_active = true;
    
    -- Current liabilities (simplified: payables)
    SELECT COALESCE(SUM(coa.current_balance), 0) INTO current_liabilities
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'liabilities'
    AND coa.account_name ILIKE '%payable%'
    AND coa.is_active = true;
    
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

-- 3. Fix check_budget_variances function
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
                WHEN (SELECT coa.account_type FROM public.chart_of_accounts coa WHERE coa.id = budget_item_record.account_id) = 'revenue' 
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

-- 4. Fix generate_monthly_trends function
CREATE OR REPLACE FUNCTION public.generate_monthly_trends(company_id_param uuid, months_back integer DEFAULT 6)
 RETURNS TABLE(month_year text, total_revenue numeric, total_expenses numeric, net_profit numeric, profit_margin numeric)
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

-- 5. Add improved validation trigger with better error messages
CREATE OR REPLACE FUNCTION public.validate_journal_entry_line_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_info RECORD;
BEGIN
    -- Get account information
    SELECT coa.account_level, coa.is_header, coa.account_name, coa.account_name_ar
    INTO account_info
    FROM public.chart_of_accounts coa
    WHERE coa.id = NEW.account_id
    AND coa.is_active = true;
    
    -- Check if account exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحساب المحاسبي غير موجود أو غير نشط'
            USING ERRCODE = 'check_violation',
                  HINT = 'تأكد من أن الحساب المحاسبي موجود ونشط';
    END IF;
    
    -- Check if account is a header account
    IF account_info.is_header = true THEN
        RAISE EXCEPTION 'لا يمكن إجراء قيود على الحسابات الرئيسية: %', 
            COALESCE(account_info.account_name_ar, account_info.account_name)
            USING ERRCODE = 'check_violation',
                  HINT = 'يُسمح بالقيود فقط على الحسابات الفرعية';
    END IF;
    
    -- Check account level (only level 3 and above allowed for entries)
    IF account_info.account_level < 3 THEN
        RAISE EXCEPTION 'مستوى الحساب غير مسموح للقيود: % (المستوى: %). يُسمح بالقيود للمستوى 3 وما فوق فقط', 
            COALESCE(account_info.account_name_ar, account_info.account_name),
            account_info.account_level
            USING ERRCODE = 'check_violation',
                  HINT = 'استخدم حساب فرعي من المستوى 3 أو أعلى';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- 6. Add comprehensive account validation function
CREATE OR REPLACE FUNCTION public.validate_account_for_transactions(account_id_param uuid)
 RETURNS TABLE(is_valid boolean, error_message text, error_message_ar text, account_level integer, is_header boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_info RECORD;
BEGIN
    -- Get account information
    SELECT coa.account_level, coa.is_header, coa.account_name, coa.account_name_ar, coa.is_active
    INTO account_info
    FROM public.chart_of_accounts coa
    WHERE coa.id = account_id_param;
    
    -- Check if account exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false as is_valid,
            'Account not found' as error_message,
            'الحساب المحاسبي غير موجود' as error_message_ar,
            0 as account_level,
            false as is_header;
        RETURN;
    END IF;
    
    -- Check if account is active
    IF account_info.is_active = false THEN
        RETURN QUERY SELECT 
            false as is_valid,
            'Account is inactive' as error_message,
            'الحساب المحاسبي غير نشط' as error_message_ar,
            account_info.account_level,
            account_info.is_header;
        RETURN;
    END IF;
    
    -- Check if account is a header account
    IF account_info.is_header = true THEN
        RETURN QUERY SELECT 
            false as is_valid,
            'Cannot post entries to header accounts' as error_message,
            'لا يمكن إجراء قيود على الحسابات الرئيسية' as error_message_ar,
            account_info.account_level,
            account_info.is_header;
        RETURN;
    END IF;
    
    -- Check account level (only level 3 and above allowed for entries)
    IF account_info.account_level < 3 THEN
        RETURN QUERY SELECT 
            false as is_valid,
            'Account level too high for transactions' as error_message,
            'مستوى الحساب غير مسموح للقيود - يجب استخدام المستوى 3 أو أعلى' as error_message_ar,
            account_info.account_level,
            account_info.is_header;
        RETURN;
    END IF;
    
    -- Account is valid
    RETURN QUERY SELECT 
        true as is_valid,
        'Account is valid for transactions' as error_message,
        'الحساب صالح للقيود المحاسبية' as error_message_ar,
        account_info.account_level,
        account_info.is_header;
END;
$function$;