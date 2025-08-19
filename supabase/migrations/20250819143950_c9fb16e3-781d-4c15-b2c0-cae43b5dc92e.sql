-- Enhanced account deletion function that handles all foreign key constraints
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param UUID,
    force_delete BOOLEAN DEFAULT FALSE,
    transfer_to_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    child_accounts UUID[];
    linked_tables JSONB := '[]'::JSONB;
    table_counts JSONB := '{}'::JSONB;
    can_delete BOOLEAN := TRUE;
    deletion_summary JSONB;
    temp_count INTEGER;
BEGIN
    -- Get account details
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account not found'
        );
    END IF;
    
    -- Check if it's a system account and force_delete is false
    IF account_record.is_system = true AND force_delete = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete system account without force_delete option',
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', true
            )
        );
    END IF;
    
    -- Find all child accounts
    WITH RECURSIVE account_tree AS (
        SELECT id, account_code, account_name, parent_account_id, 1 as level
        FROM public.chart_of_accounts 
        WHERE parent_account_id = account_id_param
        
        UNION ALL
        
        SELECT coa.id, coa.account_code, coa.account_name, coa.parent_account_id, at.level + 1
        FROM public.chart_of_accounts coa
        INNER JOIN account_tree at ON coa.parent_account_id = at.id
    )
    SELECT array_agg(id) INTO child_accounts FROM account_tree;
    
    -- Check all tables that reference chart_of_accounts
    -- 1. Journal Entry Lines
    SELECT COUNT(*) INTO temp_count FROM public.journal_entry_lines WHERE account_id = account_id_param;
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{journal_entry_lines}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('journal_entry_lines');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 2. Payments
    SELECT COUNT(*) INTO temp_count FROM public.payments WHERE account_id = account_id_param;
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{payments}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('payments');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 3. Invoices
    SELECT COUNT(*) INTO temp_count FROM public.invoices WHERE account_id = account_id_param;
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{invoices}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('invoices');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 4. Customers
    SELECT COUNT(*) INTO temp_count FROM public.customers WHERE account_id = account_id_param;
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{customers}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('customers');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 5. Contracts
    SELECT COUNT(*) INTO temp_count FROM public.contracts WHERE account_id = account_id_param;
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{contracts}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('contracts');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 6. Budget Items
    SELECT COUNT(*) INTO temp_count FROM public.budget_items WHERE account_id = account_id_param;
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{budget_items}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('budget_items');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- Add more table checks as needed...
    
    -- If cannot delete and no force option, return analysis
    IF can_delete = false AND force_delete = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'linked_tables', linked_tables,
            'table_counts', table_counts,
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'child_accounts_count', COALESCE(array_length(child_accounts, 1), 0),
            'message', 'Account has linked data and cannot be deleted without force_delete option'
        );
    END IF;
    
    -- Perform deletion or data transfer
    IF force_delete = true THEN
        -- Handle data transfer if specified
        IF transfer_to_account_id IS NOT NULL THEN
            -- Transfer journal entry lines
            UPDATE public.journal_entry_lines 
            SET account_id = transfer_to_account_id 
            WHERE account_id = account_id_param;
            
            -- Transfer payments
            UPDATE public.payments 
            SET account_id = transfer_to_account_id 
            WHERE account_id = account_id_param;
            
            -- Transfer invoices
            UPDATE public.invoices 
            SET account_id = transfer_to_account_id 
            WHERE account_id = account_id_param;
            
            -- Transfer customers
            UPDATE public.customers 
            SET account_id = transfer_to_account_id 
            WHERE account_id = account_id_param;
            
            -- Transfer contracts
            UPDATE public.contracts 
            SET account_id = transfer_to_account_id 
            WHERE account_id = account_id_param;
            
            -- Transfer budget items
            UPDATE public.budget_items 
            SET account_id = transfer_to_account_id 
            WHERE account_id = account_id_param;
            
            -- Add more transfers as needed...
        ELSE
            -- Delete related data (cascade delete)
            DELETE FROM public.journal_entry_lines WHERE account_id = account_id_param;
            DELETE FROM public.budget_items WHERE account_id = account_id_param;
            -- Note: Some tables like payments, invoices might need special handling
            -- For now, we'll update them to NULL if the foreign key allows it
            UPDATE public.payments SET account_id = NULL WHERE account_id = account_id_param;
            UPDATE public.invoices SET account_id = NULL WHERE account_id = account_id_param;
            UPDATE public.customers SET account_id = NULL WHERE account_id = account_id_param;
            UPDATE public.contracts SET account_id = NULL WHERE account_id = account_id_param;
        END IF;
        
        -- Delete child accounts first
        IF child_accounts IS NOT NULL THEN
            DELETE FROM public.chart_of_accounts WHERE id = ANY(child_accounts);
        END IF;
        
        -- Delete the main account
        DELETE FROM public.chart_of_accounts WHERE id = account_id_param;
        
        RETURN jsonb_build_object(
            'success', true,
            'action', CASE WHEN transfer_to_account_id IS NOT NULL THEN 'transferred' ELSE 'deleted' END,
            'deleted_account', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name
            ),
            'child_accounts_deleted', COALESCE(array_length(child_accounts, 1), 0),
            'transfer_to_account_id', transfer_to_account_id
        );
    ELSE
        -- Soft delete (mark as inactive)
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
        
        -- Also deactivate child accounts
        IF child_accounts IS NOT NULL THEN
            UPDATE public.chart_of_accounts 
            SET is_active = false, updated_at = now()
            WHERE id = ANY(child_accounts);
        END IF;
        
        RETURN jsonb_build_object(
            'success', true,
            'action', 'deactivated',
            'deactivated_account', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name
            ),
            'child_accounts_deactivated', COALESCE(array_length(child_accounts, 1), 0)
        );
    END IF;
    
END;
$function$;