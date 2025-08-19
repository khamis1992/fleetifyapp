-- Fix the enhanced_cascade_delete_account function - fix column reference issue
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(account_id_param uuid, force_delete boolean DEFAULT false, transfer_to_account_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    child_accounts UUID[];
    all_affected_accounts UUID[];
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
    
    -- Find all child accounts recursively
    WITH RECURSIVE account_tree AS (
        -- Start with the account to be deleted
        SELECT id, account_code, account_name, parent_account_id, 0 as level
        FROM public.chart_of_accounts 
        WHERE id = account_id_param
        
        UNION ALL
        
        -- Find all children recursively
        SELECT coa.id, coa.account_code, coa.account_name, coa.parent_account_id, at.level + 1
        FROM public.chart_of_accounts coa
        INNER JOIN account_tree at ON coa.parent_account_id = at.id
    )
    SELECT array_agg(account_tree.id) INTO all_affected_accounts FROM account_tree;
    
    -- Get only child accounts (excluding the main account)
    SELECT array_agg(account_id) INTO child_accounts 
    FROM unnest(all_affected_accounts) AS account_id 
    WHERE account_id != account_id_param;
    
    -- Check tables that have account_id column for ALL affected accounts
    -- 1. Journal Entry Lines
    SELECT COUNT(*) INTO temp_count 
    FROM public.journal_entry_lines 
    WHERE account_id = ANY(all_affected_accounts);
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{journal_entry_lines}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('journal_entry_lines');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 2. Contracts (check ALL affected accounts)
    SELECT COUNT(*) INTO temp_count 
    FROM public.contracts 
    WHERE account_id = ANY(all_affected_accounts);
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{contracts}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('contracts');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 3. Payments (check if account_id column exists)
    BEGIN
        SELECT COUNT(*) INTO temp_count 
        FROM public.payments 
        WHERE account_id = ANY(all_affected_accounts);
        IF temp_count > 0 THEN
            table_counts := jsonb_set(table_counts, '{payments}', temp_count::text::jsonb);
            linked_tables := linked_tables || jsonb_build_array('payments');
            IF force_delete = false THEN can_delete := false; END IF;
        END IF;
    EXCEPTION
        WHEN undefined_column THEN
            NULL;
    END;
    
    -- 4. Budget Items
    SELECT COUNT(*) INTO temp_count 
    FROM public.budget_items 
    WHERE account_id = ANY(all_affected_accounts);
    IF temp_count > 0 THEN
        table_counts := jsonb_set(table_counts, '{budget_items}', temp_count::text::jsonb);
        linked_tables := linked_tables || jsonb_build_array('budget_items');
        IF force_delete = false THEN can_delete := false; END IF;
    END IF;
    
    -- 5. Customer Accounts (if exists)
    BEGIN
        SELECT COUNT(*) INTO temp_count 
        FROM public.customer_accounts 
        WHERE account_id = ANY(all_affected_accounts);
        IF temp_count > 0 THEN
            table_counts := jsonb_set(table_counts, '{customer_accounts}', temp_count::text::jsonb);
            linked_tables := linked_tables || jsonb_build_array('customer_accounts');
            IF force_delete = false THEN can_delete := false; END IF;
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;
    
    -- 6. Essential Account Mappings (if exists)
    BEGIN
        SELECT COUNT(*) INTO temp_count 
        FROM public.essential_account_mappings 
        WHERE account_id = ANY(all_affected_accounts);
        IF temp_count > 0 THEN
            table_counts := jsonb_set(table_counts, '{essential_account_mappings}', temp_count::text::jsonb);
            linked_tables := linked_tables || jsonb_build_array('essential_account_mappings');
            IF force_delete = false THEN can_delete := false; END IF;
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;
    
    -- 7. Account Mappings (if exists)
    BEGIN
        SELECT COUNT(*) INTO temp_count 
        FROM public.account_mappings 
        WHERE chart_of_accounts_id = ANY(all_affected_accounts);
        IF temp_count > 0 THEN
            table_counts := jsonb_set(table_counts, '{account_mappings}', temp_count::text::jsonb);
            linked_tables := linked_tables || jsonb_build_array('account_mappings');
            IF force_delete = false THEN can_delete := false; END IF;
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;
    
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
            'message', 'Account or its child accounts have linked data and cannot be deleted without force_delete option'
        );
    END IF;
    
    -- Perform deletion or data transfer
    IF force_delete = true THEN
        -- Handle data transfer if specified
        IF transfer_to_account_id IS NOT NULL THEN
            -- Transfer journal entry lines for ALL affected accounts
            UPDATE public.journal_entry_lines 
            SET account_id = transfer_to_account_id 
            WHERE account_id = ANY(all_affected_accounts);
            
            -- Transfer contracts for ALL affected accounts
            UPDATE public.contracts 
            SET account_id = transfer_to_account_id 
            WHERE account_id = ANY(all_affected_accounts);
            
            -- Transfer budget items for ALL affected accounts
            UPDATE public.budget_items 
            SET account_id = transfer_to_account_id 
            WHERE account_id = ANY(all_affected_accounts);
            
            -- Transfer payments (if column exists)
            BEGIN
                UPDATE public.payments 
                SET account_id = transfer_to_account_id 
                WHERE account_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_column THEN
                    NULL;
            END;
            
            -- Transfer customer accounts (if exists)
            BEGIN
                UPDATE public.customer_accounts 
                SET account_id = transfer_to_account_id 
                WHERE account_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_table THEN
                    NULL;
            END;
            
            -- Transfer essential account mappings (if exists)
            BEGIN
                UPDATE public.essential_account_mappings 
                SET account_id = transfer_to_account_id 
                WHERE account_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_table THEN
                    NULL;
            END;
            
            -- Update account mappings (if exists)
            BEGIN
                UPDATE public.account_mappings 
                SET chart_of_accounts_id = transfer_to_account_id 
                WHERE chart_of_accounts_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_table THEN
                    NULL;
            END;
        ELSE
            -- Delete related data for ALL affected accounts (cascade delete)
            DELETE FROM public.journal_entry_lines WHERE account_id = ANY(all_affected_accounts);
            DELETE FROM public.budget_items WHERE account_id = ANY(all_affected_accounts);
            
            -- Delete contracts for ALL affected accounts
            DELETE FROM public.contracts WHERE account_id = ANY(all_affected_accounts);
            
            -- Delete from payments if column exists
            BEGIN
                DELETE FROM public.payments WHERE account_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_column THEN
                    NULL;
            END;
            
            -- Delete from customer accounts if exists
            BEGIN
                DELETE FROM public.customer_accounts WHERE account_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_table THEN
                    NULL;
            END;
            
            -- Delete from essential account mappings if exists
            BEGIN
                DELETE FROM public.essential_account_mappings WHERE account_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_table THEN
                    NULL;
            END;
            
            -- Delete from account mappings if exists
            BEGIN
                DELETE FROM public.account_mappings WHERE chart_of_accounts_id = ANY(all_affected_accounts);
            EXCEPTION
                WHEN undefined_table THEN
                    NULL;
            END;
        END IF;
        
        -- Delete child accounts first (in reverse order to avoid parent-child conflicts)
        IF child_accounts IS NOT NULL THEN
            DELETE FROM public.chart_of_accounts WHERE id = ANY(child_accounts);
        END IF;
        
        -- Delete the main account last
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
        -- Soft delete (mark as inactive) - ALL affected accounts
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = ANY(all_affected_accounts);
        
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
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$function$;