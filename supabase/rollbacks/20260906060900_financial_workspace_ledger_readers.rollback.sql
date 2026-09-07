-- Restores live function definitions captured read-only on 2026-09-06.
BEGIN;
DROP FUNCTION IF EXISTS public.get_income_statement_accounts_v1(uuid,date,date);
DROP FUNCTION IF EXISTS public.get_financial_workspace_v1(uuid,date);
CREATE OR REPLACE FUNCTION public.get_account_balances(company_id_param uuid, as_of_date date DEFAULT CURRENT_DATE, account_type_filter text DEFAULT NULL::text)
 RETURNS TABLE(account_id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, balance_type text, opening_balance numeric, total_debits numeric, total_credits numeric, closing_balance numeric)
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

CREATE OR REPLACE FUNCTION public.get_financial_summary(company_id_param uuid, date_from date DEFAULT NULL::date, date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_assets numeric, total_liabilities numeric, total_equity numeric, total_revenue numeric, total_expenses numeric, net_income numeric, unbalanced_entries_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
-- Restore the original ACLs as captured from pg_proc.proacl.
GRANT EXECUTE ON FUNCTION public.get_account_balances(uuid,date,text) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid,date) TO PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(uuid,date,date) TO PUBLIC,anon,authenticated,service_role;
COMMIT;
