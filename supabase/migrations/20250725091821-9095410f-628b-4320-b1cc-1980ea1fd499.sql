-- Create function to get account balances
CREATE OR REPLACE FUNCTION public.get_account_balances(
    company_id_param uuid,
    as_of_date date DEFAULT CURRENT_DATE,
    account_type_filter text DEFAULT NULL
)
RETURNS TABLE (
    account_id uuid,
    account_code varchar,
    account_name text,
    account_name_ar text,
    account_type text,
    balance_type text,
    opening_balance numeric,
    total_debits numeric,
    total_credits numeric,
    closing_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id as account_id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.balance_type,
        coa.current_balance as opening_balance,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits,
        CASE 
            WHEN coa.balance_type = 'debit' THEN 
                coa.current_balance + COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)
            ELSE 
                coa.current_balance + COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)
        END as closing_balance
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_entry_lines jel ON coa.id = jel.account_id
    LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.company_id = company_id_param
        AND coa.is_active = true
        AND (je.entry_date <= as_of_date OR je.entry_date IS NULL)
        AND (je.status = 'posted' OR je.status IS NULL)
        AND (account_type_filter IS NULL OR coa.account_type = account_type_filter)
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_name_ar, 
             coa.account_type, coa.balance_type, coa.current_balance
    ORDER BY coa.account_code;
END;
$function$;

-- Create function to get trial balance
CREATE OR REPLACE FUNCTION public.get_trial_balance(
    company_id_param uuid,
    as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    account_id uuid,
    account_code varchar,
    account_name text,
    account_name_ar text,
    account_type text,
    account_level integer,
    debit_balance numeric,
    credit_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Create function to get financial summary
CREATE OR REPLACE FUNCTION public.get_financial_summary(
    company_id_param uuid,
    date_from date DEFAULT NULL,
    date_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_assets numeric,
    total_liabilities numeric,
    total_equity numeric,
    total_revenue numeric,
    total_expenses numeric,
    net_income numeric,
    unbalanced_entries_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    assets_total numeric := 0;
    liabilities_total numeric := 0;
    equity_total numeric := 0;
    revenue_total numeric := 0;
    expenses_total numeric := 0;
    unbalanced_count bigint := 0;
BEGIN
    -- Calculate totals by account type
    SELECT 
        COALESCE(SUM(CASE WHEN coa.account_type = 'assets' THEN 
            coa.current_balance + COALESCE(debit_sum, 0) - COALESCE(credit_sum, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN coa.account_type = 'liabilities' THEN 
            coa.current_balance + COALESCE(credit_sum, 0) - COALESCE(debit_sum, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN coa.account_type = 'equity' THEN 
            coa.current_balance + COALESCE(credit_sum, 0) - COALESCE(debit_sum, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN 
            COALESCE(credit_sum, 0) - COALESCE(debit_sum, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN coa.account_type = 'expenses' THEN 
            COALESCE(debit_sum, 0) - COALESCE(credit_sum, 0) ELSE 0 END), 0)
    INTO assets_total, liabilities_total, equity_total, revenue_total, expenses_total
    FROM public.chart_of_accounts coa
    LEFT JOIN (
        SELECT 
            jel.account_id,
            SUM(jel.debit_amount) as debit_sum,
            SUM(jel.credit_amount) as credit_sum
        FROM public.journal_entry_lines jel
        JOIN public.journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.company_id = company_id_param
            AND je.status = 'posted'
            AND (date_from IS NULL OR je.entry_date >= date_from)
            AND je.entry_date <= date_to
        GROUP BY jel.account_id
    ) balances ON coa.id = balances.account_id
    WHERE coa.company_id = company_id_param
        AND coa.is_active = true;
    
    -- Count unbalanced entries
    SELECT COUNT(*)
    INTO unbalanced_count
    FROM public.journal_entries je
    WHERE je.company_id = company_id_param
        AND je.total_debit != je.total_credit
        AND (date_from IS NULL OR je.entry_date >= date_from)
        AND je.entry_date <= date_to;
    
    RETURN QUERY SELECT 
        assets_total,
        liabilities_total,
        equity_total,
        revenue_total,
        expenses_total,
        revenue_total - expenses_total as net_income,
        unbalanced_count;
END;
$function$;

-- Create function for cost center analysis
CREATE OR REPLACE FUNCTION public.get_cost_center_analysis(
    company_id_param uuid,
    date_from date DEFAULT NULL,
    date_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    cost_center_id uuid,
    center_code text,
    center_name text,
    center_name_ar text,
    total_debits numeric,
    total_credits numeric,
    net_amount numeric,
    entry_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id as cost_center_id,
        cc.center_code,
        cc.center_name,
        cc.center_name_ar,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits,
        COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as net_amount,
        COUNT(jel.id) as entry_count
    FROM public.cost_centers cc
    LEFT JOIN public.journal_entry_lines jel ON cc.id = jel.cost_center_id
    LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE cc.company_id = company_id_param
        AND cc.is_active = true
        AND (je.entry_date IS NULL OR 
             (date_from IS NULL OR je.entry_date >= date_from) AND 
             je.entry_date <= date_to)
        AND (je.status = 'posted' OR je.status IS NULL)
    GROUP BY cc.id, cc.center_code, cc.center_name, cc.center_name_ar
    ORDER BY cc.center_code;
END;
$function$;

-- Create function to reverse journal entry
CREATE OR REPLACE FUNCTION public.reverse_journal_entry(
    entry_id uuid,
    reversal_reason text,
    reversed_by_user uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    original_entry record;
    reversal_entry_id uuid;
    line_record record;
BEGIN
    -- Get the original entry
    SELECT * INTO original_entry
    FROM public.journal_entries
    WHERE id = entry_id AND status = 'posted';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Journal entry not found or not posted';
    END IF;
    
    -- Create reversal entry
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        total_debit,
        total_credit,
        status,
        created_by,
        reference_type,
        reference_id
    ) VALUES (
        gen_random_uuid(),
        original_entry.company_id,
        generate_journal_entry_number(original_entry.company_id),
        CURRENT_DATE,
        'Reversal of ' || original_entry.entry_number || ' - ' || reversal_reason,
        original_entry.total_debit,
        original_entry.total_credit,
        'posted',
        reversed_by_user,
        'reversal',
        original_entry.id
    ) RETURNING id INTO reversal_entry_id;
    
    -- Create reversal lines (swap debit/credit)
    FOR line_record IN 
        SELECT * FROM public.journal_entry_lines 
        WHERE journal_entry_id = entry_id
        ORDER BY line_number
    LOOP
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            reversal_entry_id,
            line_record.account_id,
            line_record.cost_center_id,
            line_record.line_number,
            'Reversal: ' || COALESCE(line_record.line_description, ''),
            line_record.credit_amount,  -- Swap
            line_record.debit_amount    -- Swap
        );
    END LOOP;
    
    -- Update original entry
    UPDATE public.journal_entries
    SET 
        status = 'reversed',
        reversed_by = reversed_by_user,
        reversed_at = now(),
        reversal_entry_id = reversal_entry_id
    WHERE id = entry_id;
    
    RETURN reversal_entry_id;
END;
$function$;

-- Create function to export ledger data
CREATE OR REPLACE FUNCTION public.export_ledger_data(
    company_id_param uuid,
    export_format text DEFAULT 'csv',
    filters jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    result text;
BEGIN
    -- This is a placeholder function that would typically integrate with external services
    -- For now, return a success message indicating the export request was received
    result := 'Export request for ' || export_format || ' format has been queued for processing.';
    
    -- In a real implementation, this would:
    -- 1. Query the data based on filters
    -- 2. Format it according to the export_format
    -- 3. Store the file in a storage service
    -- 4. Return a download URL or trigger an email with the file
    
    RETURN result;
END;
$function$;