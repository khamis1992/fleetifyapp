-- Fix the enhanced deletion function syntax error
CREATE OR REPLACE FUNCTION public.analyze_account_deletion_enhanced(account_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_info RECORD;
    child_count INTEGER;
    journal_entries_count INTEGER;
    contracts_count INTEGER;
    invoices_count INTEGER;
    payments_count INTEGER;
    customers_count INTEGER;
    vehicles_count INTEGER;
    legal_cases_count INTEGER;
    budget_items_count INTEGER;
    bank_transactions_count INTEGER;
    can_delete BOOLEAN := true;
    blocking_reasons TEXT[] := ARRAY[]::TEXT[];
    warnings TEXT[] := ARRAY[]::TEXT[];
    suggestions TEXT[] := ARRAY[]::TEXT[];
    table_counts JSONB;
BEGIN
    -- Get account information
    SELECT * INTO account_info
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_delete', false,
            'account_info', null,
            'blocking_reasons', ARRAY['الحساب غير موجود'],
            'warnings', ARRAY[]::TEXT[],
            'suggestions', ARRAY[]::TEXT[],
            'affected_data', jsonb_build_object()
        );
    END IF;
    
    -- Count child accounts
    SELECT COUNT(*) INTO child_count
    FROM public.chart_of_accounts 
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- Count journal entries
    SELECT COUNT(*) INTO journal_entries_count
    FROM public.journal_entry_lines 
    WHERE account_id = account_id_param;
    
    -- Count contracts  
    SELECT COUNT(*) INTO contracts_count
    FROM public.contracts 
    WHERE account_id = account_id_param;
    
    -- Count invoices
    SELECT COUNT(*) INTO invoices_count
    FROM public.invoices 
    WHERE account_id = account_id_param;
    
    -- Count payments
    SELECT COUNT(*) INTO payments_count
    FROM public.payments 
    WHERE account_id = account_id_param;
    
    -- Count customers
    SELECT COUNT(*) INTO customers_count
    FROM public.customers 
    WHERE account_id = account_id_param;
    
    -- Count vehicles
    SELECT COUNT(*) INTO vehicles_count
    FROM public.vehicles 
    WHERE account_id = account_id_param;
    
    -- Count legal cases
    SELECT COUNT(*) INTO legal_cases_count
    FROM public.legal_cases 
    WHERE account_id = account_id_param;
    
    -- Count budget items
    SELECT COUNT(*) INTO budget_items_count
    FROM public.budget_items 
    WHERE account_id = account_id_param;
    
    -- Count bank transactions (both debit and credit account references)
    SELECT COUNT(*) INTO bank_transactions_count
    FROM public.bank_transactions bt
    JOIN public.journal_entries je ON bt.journal_entry_id = je.id
    JOIN public.journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE jel.account_id = account_id_param;
    
    -- Build table counts JSONB object
    table_counts := jsonb_build_object(
        'child_accounts', child_count,
        'journal_entries', journal_entries_count,
        'contracts', contracts_count,
        'invoices', invoices_count,
        'payments', payments_count,
        'customers', customers_count,
        'vehicles', vehicles_count,
        'legal_cases', legal_cases_count,
        'budget_items', budget_items_count,
        'bank_transactions', bank_transactions_count
    );
    
    -- Check for blocking conditions
    IF child_count > 0 THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'يحتوي على حسابات فرعية (' || child_count || ' حساب)');
        suggestions := array_append(suggestions, 'قم بحذف أو نقل الحسابات الفرعية أولاً');
    END IF;
    
    IF journal_entries_count > 0 THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'يحتوي على قيود محاسبية (' || journal_entries_count || ' قيد)');
        suggestions := array_append(suggestions, 'لا يمكن حذف حساب له قيود محاسبية. فكر في إلغاء تنشيط الحساب بدلاً من الحذف');
    END IF;
    
    -- Check for data that can be transferred
    IF contracts_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بعقود (' || contracts_count || ' عقد)');
        suggestions := array_append(suggestions, 'يمكن نقل العقود إلى حساب آخر');
    END IF;
    
    IF invoices_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بفواتير (' || invoices_count || ' فاتورة)');
        suggestions := array_append(suggestions, 'يمكن نقل الفواتير إلى حساب آخر');
    END IF;
    
    IF payments_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بدفعات (' || payments_count || ' دفعة)');
        suggestions := array_append(suggestions, 'يمكن نقل الدفعات إلى حساب آخر');
    END IF;
    
    IF customers_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بعملاء (' || customers_count || ' عميل)');
        suggestions := array_append(suggestions, 'يمكن نقل العملاء إلى حساب آخر أو إزالة الربط');
    END IF;
    
    IF vehicles_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بمركبات (' || vehicles_count || ' مركبة)');
        suggestions := array_append(suggestions, 'يمكن نقل المركبات إلى حساب آخر أو إزالة الربط');
    END IF;
    
    IF legal_cases_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بقضايا قانونية (' || legal_cases_count || ' قضية)');
        suggestions := array_append(suggestions, 'يمكن نقل القضايا القانونية إلى حساب آخر');
    END IF;
    
    IF budget_items_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط ببنود الموازنة (' || budget_items_count || ' بند)');
        suggestions := array_append(suggestions, 'يمكن نقل بنود الموازنة إلى حساب آخر');
    END IF;
    
    IF bank_transactions_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بحركات بنكية (' || bank_transactions_count || ' حركة)');
        suggestions := array_append(suggestions, 'الحركات البنكية مرتبطة عبر القيود المحاسبية');
    END IF;
    
    -- Check if account is a system account
    IF account_info.is_system THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'هذا حساب نظام ولا يمكن حذفه');
    END IF;
    
    -- Return comprehensive analysis
    RETURN jsonb_build_object(
        'can_delete', can_delete,
        'account_info', row_to_json(account_info),
        'blocking_reasons', blocking_reasons,
        'warnings', warnings,
        'suggestions', suggestions,
        'affected_data', table_counts
    );
END;
$function$;