-- Fix ambiguous column reference issues in chart_of_accounts related functions

-- Update get_entry_allowed_accounts function to ensure all column references are properly prefixed
CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, balance_type text, parent_account_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.account_level,
        coa.balance_type,
        parent_coa.account_name as parent_account_name
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND coa.account_level >= 3  -- السماح للمستويات 3 وما فوق
    AND coa.is_header = false   -- فقط الحسابات غير العناوين
    ORDER BY coa.account_code;
END;
$$;

-- Update get_reporting_accounts function to ensure all column references are properly prefixed
CREATE OR REPLACE FUNCTION public.get_reporting_accounts(company_id_param uuid)
RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, balance_type text, parent_account_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.account_level,
        coa.balance_type,
        parent_coa.account_name as parent_account_name
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND (coa.account_level < 5 OR coa.is_header = true)  -- Levels 1-4 or header accounts
    ORDER BY coa.account_code;
END;
$$;

-- Update get_available_customer_accounts function to ensure proper column prefixes
CREATE OR REPLACE FUNCTION public.get_available_customer_accounts(company_id_param uuid)
RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, parent_account_name text, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        parent_coa.account_name as parent_account_name,
        NOT EXISTS(
            SELECT 1 FROM public.customer_accounts ca 
            WHERE ca.account_id = coa.id AND ca.company_id = company_id_param
        ) as is_available
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%receivable%' 
         OR coa.account_name ILIKE '%مدين%' 
         OR coa.account_name ILIKE '%ذمم%'
         OR coa.account_code LIKE '112%')
    AND coa.is_active = true
    AND coa.is_header = false
    ORDER BY coa.account_code;
END;
$$;

-- Update get_trial_balance function to ensure all column references are properly prefixed
CREATE OR REPLACE FUNCTION public.get_trial_balance(company_id_param uuid, as_of_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(account_id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, debit_balance numeric, credit_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;