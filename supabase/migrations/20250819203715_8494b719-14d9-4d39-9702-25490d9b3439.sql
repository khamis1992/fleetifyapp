-- Drop all existing versions of enhanced_cascade_delete_account function
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid, boolean, uuid);
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid, boolean, uuid, boolean);

-- Recreate the function with the correct 4-parameter signature
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param UUID,
    force_delete BOOLEAN DEFAULT false,
    transfer_to_account_id UUID DEFAULT NULL,
    analysis_only BOOLEAN DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record RECORD;
    linked_tables TEXT[] := ARRAY[]::TEXT[];
    table_counts JSONB := '{}'::JSONB;
    child_accounts_count INTEGER := 0;
    affected_records JSONB := '{}'::JSONB;
    deletion_log_id UUID;
    result JSONB;
BEGIN
    -- Get account information
    SELECT * INTO account_record
    FROM chart_of_accounts 
    WHERE id = account_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'الحساب غير موجود أو غير نشط'
        );
    END IF;
    
    -- Count child accounts
    SELECT COUNT(*) INTO child_accounts_count
    FROM chart_of_accounts 
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- Check for linked data in various tables
    DECLARE
        table_name TEXT;
        count_query TEXT;
        record_count INTEGER;
    BEGIN
        -- List of tables to check
        FOR table_name IN 
            SELECT unnest(ARRAY[
                'journal_entry_lines',
                'invoices', 
                'payments',
                'contracts',
                'customers',
                'vehicles',
                'legal_cases'
            ])
        LOOP
            -- Build dynamic count query
            count_query := format('SELECT COUNT(*) FROM %I WHERE account_id = $1', table_name);
            
            BEGIN
                EXECUTE count_query INTO record_count USING account_id_param;
                
                IF record_count > 0 THEN
                    linked_tables := linked_tables || table_name;
                    table_counts := table_counts || jsonb_build_object(table_name, record_count);
                END IF;
            EXCEPTION
                WHEN undefined_column THEN
                    -- Skip tables that don't have account_id column
                    CONTINUE;
            END;
        END LOOP;
    END;
    
    -- For analysis only, return the analysis without making changes
    IF analysis_only THEN
        RETURN jsonb_build_object(
            'success', true,
            'can_delete', (array_length(linked_tables, 1) IS NULL OR array_length(linked_tables, 1) = 0) AND child_accounts_count = 0,
            'linked_tables', linked_tables,
            'table_counts', table_counts,
            'child_accounts_count', child_accounts_count,
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'message', CASE 
                WHEN account_record.is_system THEN 'هذا حساب نظام ولا يمكن حذفه'
                WHEN child_accounts_count > 0 THEN 'يحتوي الحساب على ' || child_accounts_count || ' حساب فرعي'
                WHEN array_length(linked_tables, 1) > 0 THEN 'يحتوي الحساب على بيانات مرتبطة في ' || array_length(linked_tables, 1) || ' جدول'
                ELSE 'يمكن حذف الحساب بأمان'
            END
        );
    END IF;
    
    -- Prevent deletion of system accounts
    IF account_record.is_system AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'لا يمكن حذف حسابات النظام'
        );
    END IF;
    
    -- Check if account has child accounts
    IF child_accounts_count > 0 AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'لا يمكن حذف حساب يحتوي على حسابات فرعية. استخدم الحذف القسري إذا كنت متأكداً.'
        );
    END IF;
    
    -- Check if account has linked data
    IF array_length(linked_tables, 1) > 0 AND NOT force_delete AND transfer_to_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'linked_tables', linked_tables,
            'table_counts', table_counts,
            'error', 'الحساب مرتبط ببيانات في الجداول التالية. يجب نقل البيانات أو استخدام الحذف القسري.'
        );
    END IF;
    
    -- Create deletion log entry
    INSERT INTO account_deletion_log (
        company_id,
        deleted_account_id,
        deleted_account_code,
        deleted_account_name,
        deletion_type,
        transfer_to_account_id,
        deletion_reason,
        deleted_by
    ) VALUES (
        account_record.company_id,
        account_record.id,
        account_record.account_code,
        account_record.account_name,
        CASE 
            WHEN transfer_to_account_id IS NOT NULL THEN 'transferred'
            WHEN force_delete THEN 'force'
            ELSE 'normal'
        END,
        transfer_to_account_id,
        'Account deletion via enhanced cascade delete',
        auth.uid()
    ) RETURNING id INTO deletion_log_id;
    
    -- Transfer data if transfer account is specified
    IF transfer_to_account_id IS NOT NULL THEN
        -- Update all linked records to use the transfer account
        -- This will work because of the ON DELETE SET NULL constraints we set up
        FOR table_name IN SELECT unnest(linked_tables)
        LOOP
            BEGIN
                EXECUTE format('UPDATE %I SET account_id = $1 WHERE account_id = $2', table_name)
                USING transfer_to_account_id, account_id_param;
            EXCEPTION
                WHEN undefined_column THEN
                    CONTINUE;
            END;
        END LOOP;
    END IF;
    
    -- Delete child accounts if force delete
    IF force_delete AND child_accounts_count > 0 THEN
        DELETE FROM chart_of_accounts 
        WHERE parent_account_id = account_id_param;
        
        affected_records := affected_records || jsonb_build_object('child_accounts_deleted', child_accounts_count);
    END IF;
    
    -- Delete the main account
    DELETE FROM chart_of_accounts WHERE id = account_id_param;
    
    -- Update deletion log with affected records
    UPDATE account_deletion_log 
    SET affected_records = affected_records
    WHERE id = deletion_log_id;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'deleted_account', jsonb_build_object(
            'code', account_record.account_code,
            'name', account_record.account_name
        ),
        'deletion_log_id', deletion_log_id
    );
    
    -- Add action type and additional info
    IF transfer_to_account_id IS NOT NULL THEN
        result := result || jsonb_build_object(
            'action', 'transferred',
            'transfer_to_account_id', transfer_to_account_id
        );
    ELSIF force_delete THEN
        result := result || jsonb_build_object(
            'action', 'force',
            'child_accounts_deleted', child_accounts_count
        );
    ELSE
        result := result || jsonb_build_object('action', 'deleted');
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;