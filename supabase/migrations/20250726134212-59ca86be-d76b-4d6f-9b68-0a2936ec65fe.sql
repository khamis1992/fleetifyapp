-- إصلاح باقي الوظائف المالية لحل مشاكل account_code المبهمة

-- إصلاح الوظيفة get_account_balances
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

-- إصلاح الوظيفة get_trial_balance
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