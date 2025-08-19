-- Fix the enhanced_cascade_delete_account function to resolve PostgreSQL syntax errors
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param uuid,
    transfer_to_account_id_param uuid DEFAULT NULL,
    force_delete_param boolean DEFAULT false
)
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
    deleted_count INTEGER := 0;
BEGIN
    -- Get account information
    SELECT * INTO account_info
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحساب غير موجود',
            'deleted_count', 0
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
    
    -- Count bank transactions
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
    
    IF journal_entries_count > 0 AND NOT force_delete_param THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'يحتوي على قيود محاسبية (' || journal_entries_count || ' قيد)');
        suggestions := array_append(suggestions, 'استخدم الحذف القسري أو قم بإلغاء تنشيط الحساب');
    END IF;
    
    -- Check if account is a system account
    IF account_info.is_system AND NOT force_delete_param THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'هذا حساب نظام ولا يمكن حذفه إلا بالحذف القسري');
    END IF;
    
    -- If we can't delete and not forcing, return analysis
    IF NOT can_delete AND NOT force_delete_param THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'account_info', row_to_json(account_info),
            'blocking_reasons', blocking_reasons,
            'warnings', warnings,
            'suggestions', suggestions,
            'affected_data', table_counts,
            'deleted_count', 0
        );
    END IF;
    
    -- If we're here, we can proceed with deletion/transfer
    IF transfer_to_account_id_param IS NOT NULL THEN
        -- Transfer data to another account
        IF contracts_count > 0 THEN
            UPDATE public.contracts 
            SET account_id = transfer_to_account_id_param 
            WHERE account_id = account_id_param;
        END IF;
        
        IF invoices_count > 0 THEN
            UPDATE public.invoices 
            SET account_id = transfer_to_account_id_param 
            WHERE account_id = account_id_param;
        END IF;
        
        IF payments_count > 0 THEN
            UPDATE public.payments 
            SET account_id = transfer_to_account_id_param 
            WHERE account_id = account_id_param;
        END IF;
        
        IF customers_count > 0 THEN
            UPDATE public.customers 
            SET account_id = transfer_to_account_id_param 
            WHERE account_id = account_id_param;
        END IF;
        
        IF vehicles_count > 0 THEN
            UPDATE public.vehicles 
            SET account_id = transfer_to_account_id_param 
            WHERE account_id = account_id_param;
        END IF;
        
        IF legal_cases_count > 0 THEN
            UPDATE public.legal_cases 
            SET account_id = transfer_to_account_id_param 
            WHERE account_id = account_id_param;
        END IF;
        
        IF budget_items_count > 0 THEN
            UPDATE public.budget_items 
            SET account_id = transfer_to_account_id_param 
            WHERE account_id = account_id_param;
        END IF;
    END IF;
    
    -- Delete child accounts first (cascade)
    IF child_count > 0 THEN
        DELETE FROM public.chart_of_accounts 
        WHERE parent_account_id = account_id_param;
        deleted_count := deleted_count + child_count;
    END IF;
    
    -- Delete the main account
    DELETE FROM public.chart_of_accounts 
    WHERE id = account_id_param;
    deleted_count := deleted_count + 1;
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'can_delete', true,
        'account_info', row_to_json(account_info),
        'transferred_data', transfer_to_account_id_param IS NOT NULL,
        'transfer_to_account_id', transfer_to_account_id_param,
        'force_deleted', force_delete_param,
        'affected_data', table_counts,
        'deleted_count', deleted_count,
        'message', 'تم حذف الحساب بنجاح'
    );
END;
$function$;