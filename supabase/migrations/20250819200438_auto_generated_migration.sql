-- Drop ALL versions of the enhanced_cascade_delete_account function
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid);
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid, uuid);
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid, boolean, uuid);

-- Create the correct function from scratch
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
    action_taken TEXT := 'deleted';
BEGIN
    -- Get account information
    SELECT * INTO account_info
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'الحساب غير موجود',
            'account_info', null,
            'child_accounts_count', 0,
            'linked_tables', ARRAY[]::text[],
            'table_counts', '{}'::jsonb
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
    
    -- If we can't delete and not forcing, return analysis ONLY (not success)
    IF NOT can_delete AND NOT force_delete_param THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'account_info', jsonb_build_object(
                'code', account_info.account_code,
                'name', account_info.account_name,
                'is_system', account_info.is_system
            ),
            'child_accounts_count', child_count,
            'linked_tables', CASE 
                WHEN journal_entries_count > 0 OR contracts_count > 0 OR invoices_count > 0 OR 
                     payments_count > 0 OR customers_count > 0 OR vehicles_count > 0 OR 
                     legal_cases_count > 0 OR budget_items_count > 0 OR bank_transactions_count > 0 
                THEN ARRAY['journal_entries', 'contracts', 'invoices', 'payments', 'customers', 'vehicles', 'legal_cases', 'budget_items', 'bank_transactions']
                ELSE ARRAY[]::text[]
            END,
            'table_counts', table_counts,
            'message', array_to_string(blocking_reasons, '; ')
        );
    END IF;
    
    -- If we're here, we can proceed with deletion/transfer
    IF transfer_to_account_id_param IS NOT NULL THEN
        action_taken := 'transferred';
        
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
    ELSIF NOT force_delete_param THEN
        -- Deactivate instead of delete
        action_taken := 'deactivated';
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
        deleted_count := 1;
    ELSE 
        -- Force delete
        action_taken := 'deleted';
        
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
    END IF;
    
    -- Return success response (only when actual deletion/deactivation occurs)
    RETURN jsonb_build_object(
        'success', true,
        'can_delete', true,
        'action', action_taken,
        'deleted_account', jsonb_build_object(
            'code', account_info.account_code,
            'name', account_info.account_name
        ),
        'child_accounts_count', child_count,
        'child_accounts_deleted', CASE WHEN action_taken = 'deleted' THEN child_count ELSE NULL END,
        'child_accounts_deactivated', CASE WHEN action_taken = 'deactivated' THEN child_count ELSE NULL END,
        'transfer_to_account_id', transfer_to_account_id_param,
        'table_counts', table_counts
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'خطأ في تنفيذ العملية: ' || SQLERRM,
            'account_info', jsonb_build_object(
                'code', COALESCE(account_info.account_code, ''),
                'name', COALESCE(account_info.account_name, ''),
                'is_system', COALESCE(account_info.is_system, false)
            ),
            'child_accounts_count', 0,
            'linked_tables', ARRAY[]::text[],
            'table_counts', '{}'::jsonb
        );
END;
$function$;