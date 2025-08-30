-- Fix enhanced cascade delete account function to only check tables with account_id
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param uuid,
    force_delete boolean DEFAULT false,
    transfer_to_account_id uuid DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record RECORD;
    child_count INTEGER := 0;
    linked_tables TEXT[] := '{}';
    table_counts JSONB := '{}';
    result JSONB;
    transfer_account_record RECORD;
BEGIN
    -- Get account details
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'Account not found or already inactive'
        );
    END IF;
    
    -- Count child accounts
    SELECT COUNT(*) INTO child_count
    FROM public.chart_of_accounts
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- Check for linked records in tables that actually have account_id
    -- Journal Entry Lines
    IF EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE account_id = account_id_param) THEN
        linked_tables := array_append(linked_tables, 'journal_entry_lines');
        SELECT COUNT(*) FROM public.journal_entry_lines WHERE account_id = account_id_param
        INTO table_counts->'journal_entry_lines';
    END IF;
    
    -- Contracts
    IF EXISTS (SELECT 1 FROM public.contracts WHERE account_id = account_id_param) THEN
        linked_tables := array_append(linked_tables, 'contracts');
        SELECT COUNT(*) FROM public.contracts WHERE account_id = account_id_param
        INTO table_counts->'contracts';
    END IF;
    
    -- Payments
    IF EXISTS (SELECT 1 FROM public.payments WHERE account_id = account_id_param) THEN
        linked_tables := array_append(linked_tables, 'payments');
        SELECT COUNT(*) FROM public.payments WHERE account_id = account_id_param
        INTO table_counts->'payments';
    END IF;
    
    -- Budget Items
    IF EXISTS (SELECT 1 FROM public.budget_items WHERE account_id = account_id_param) THEN
        linked_tables := array_append(linked_tables, 'budget_items');
        SELECT COUNT(*) FROM public.budget_items WHERE account_id = account_id_param
        INTO table_counts->'budget_items';
    END IF;
    
    -- If this is just analysis (not actual deletion), return results
    IF force_delete = false AND transfer_to_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'can_delete', array_length(linked_tables, 1) IS NULL AND child_count = 0,
            'linked_tables', linked_tables,
            'table_counts', table_counts,
            'child_accounts_count', child_count,
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            )
        );
    END IF;
    
    -- Validate transfer account if provided
    IF transfer_to_account_id IS NOT NULL THEN
        SELECT * INTO transfer_account_record
        FROM public.chart_of_accounts
        WHERE id = transfer_to_account_id AND is_active = true;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Transfer account not found or inactive'
            );
        END IF;
        
        -- Transfer records to new account
        UPDATE public.journal_entry_lines SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
        UPDATE public.contracts SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
        UPDATE public.payments SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
        UPDATE public.budget_items SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
        
        -- Deactivate child accounts
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE parent_account_id = account_id_param;
        
        -- Delete the account
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
        
        RETURN jsonb_build_object(
            'success', true,
            'action', 'transferred',
            'transfer_to_account_id', transfer_to_account_id,
            'deleted_account', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name
            ),
            'child_accounts_deactivated', child_count
        );
    END IF;
    
    -- Force delete - check if system account
    IF account_record.is_system AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete system account without force flag'
        );
    END IF;
    
    -- If has linked records and not forcing, cannot delete
    IF array_length(linked_tables, 1) > 0 AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'Account has linked records. Use force delete or transfer option.'
        );
    END IF;
    
    -- Force delete: remove all references and delete account
    IF force_delete THEN
        -- Delete journal entry lines
        DELETE FROM public.journal_entry_lines WHERE account_id = account_id_param;
        
        -- Update contracts to remove account reference
        UPDATE public.contracts SET account_id = null WHERE account_id = account_id_param;
        
        -- Update payments to remove account reference  
        UPDATE public.payments SET account_id = null WHERE account_id = account_id_param;
        
        -- Delete budget items
        DELETE FROM public.budget_items WHERE account_id = account_id_param;
        
        -- Deactivate child accounts
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE parent_account_id = account_id_param;
        
        -- Delete the account
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
        
        RETURN jsonb_build_object(
            'success', true,
            'action', 'deleted',
            'deleted_account', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name
            ),
            'child_accounts_deleted', child_count
        );
    END IF;
    
    -- Default case - just deactivate
    UPDATE public.chart_of_accounts 
    SET is_active = false, updated_at = now()
    WHERE id = account_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'action', 'deactivated',
        'deleted_account', jsonb_build_object(
            'code', account_record.account_code,
            'name', account_record.account_name
        )
    );
END;
$$;