-- Function to recursively delete account and all its children
CREATE OR REPLACE FUNCTION public.cascade_delete_account_with_children(
    account_id_param uuid,
    force_delete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record RECORD;
    child_record RECORD;
    has_transactions boolean := false;
    deleted_accounts jsonb := '[]'::jsonb;
    result jsonb;
    child_result jsonb;
BEGIN
    -- Get account details
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account not found or already inactive',
            'deleted_accounts', '[]'::jsonb
        );
    END IF;
    
    -- Prevent deletion of system accounts unless forced
    IF account_record.is_system = true AND force_delete = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot delete system account without force flag',
            'deleted_accounts', '[]'::jsonb
        );
    END IF;
    
    -- Recursively delete all child accounts first
    FOR child_record IN 
        SELECT id FROM public.chart_of_accounts 
        WHERE parent_account_id = account_id_param AND is_active = true
    LOOP
        -- Recursive call for each child
        SELECT cascade_delete_account_with_children(child_record.id, force_delete) INTO child_result;
        
        -- If any child deletion fails, return error
        IF (child_result->>'success')::boolean = false THEN
            RETURN child_result;
        END IF;
        
        -- Accumulate deleted accounts
        deleted_accounts := deleted_accounts || (child_result->'deleted_accounts');
    END LOOP;
    
    -- Check if current account has transactions
    SELECT EXISTS(
        SELECT 1 FROM public.journal_entry_lines 
        WHERE account_id = account_id_param
        LIMIT 1
    ) INTO has_transactions;
    
    -- If account has transactions, perform soft delete
    IF has_transactions THEN
        UPDATE public.chart_of_accounts
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
        
        -- Add to deleted accounts list
        deleted_accounts := deleted_accounts || jsonb_build_array(
            jsonb_build_object(
                'id', account_record.id,
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'deletion_type', 'soft'
            )
        );
    ELSE
        -- No transactions, perform hard delete
        DELETE FROM public.chart_of_accounts
        WHERE id = account_id_param;
        
        -- Add to deleted accounts list
        deleted_accounts := deleted_accounts || jsonb_build_array(
            jsonb_build_object(
                'id', account_record.id,
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'deletion_type', 'permanent'
            )
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_accounts', deleted_accounts,
        'total_deleted', jsonb_array_length(deleted_accounts)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'deleted_accounts', '[]'::jsonb
        );
END;
$$;

-- Function to get account deletion preview (what will be deleted)
CREATE OR REPLACE FUNCTION public.get_account_deletion_preview(
    account_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record RECORD;
    child_accounts jsonb := '[]'::jsonb;
    has_transactions boolean := false;
    child_record RECORD;
    child_preview jsonb;
BEGIN
    -- Get account details
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account not found'
        );
    END IF;
    
    -- Check if account has transactions
    SELECT EXISTS(
        SELECT 1 FROM public.journal_entry_lines 
        WHERE account_id = account_id_param
        LIMIT 1
    ) INTO has_transactions;
    
    -- Get all child accounts recursively
    FOR child_record IN 
        SELECT * FROM public.chart_of_accounts 
        WHERE parent_account_id = account_id_param AND is_active = true
    LOOP
        -- Get preview for child
        SELECT get_account_deletion_preview(child_record.id) INTO child_preview;
        
        -- Add child accounts
        child_accounts := child_accounts || (child_preview->'child_accounts');
        child_accounts := child_accounts || jsonb_build_array(
            jsonb_build_object(
                'id', child_record.id,
                'account_code', child_record.account_code,
                'account_name', child_record.account_name,
                'account_level', child_record.account_level,
                'has_transactions', EXISTS(
                    SELECT 1 FROM public.journal_entry_lines 
                    WHERE account_id = child_record.id
                    LIMIT 1
                )
            )
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'account', jsonb_build_object(
            'id', account_record.id,
            'account_code', account_record.account_code,
            'account_name', account_record.account_name,
            'account_level', account_record.account_level,
            'is_system', account_record.is_system,
            'has_transactions', has_transactions
        ),
        'child_accounts', child_accounts,
        'total_children', jsonb_array_length(child_accounts),
        'can_delete_permanently', NOT has_transactions AND NOT account_record.is_system
    );
END;
$$;