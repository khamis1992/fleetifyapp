-- Enhanced solution for handling foreign key constraints during account deletion
-- This will safely handle fixed_assets and budget_items constraints

CREATE OR REPLACE FUNCTION public.safe_cleanup_account_references(target_account_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    fixed_assets_count INTEGER := 0;
    budget_items_count INTEGER := 0;
    cleanup_log TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Count and clean fixed assets references
    SELECT COUNT(*) INTO fixed_assets_count
    FROM fixed_assets 
    WHERE asset_account_id = target_account_id 
    OR depreciation_account_id = target_account_id;
    
    IF fixed_assets_count > 0 THEN
        -- Set fixed assets account references to NULL before deletion
        UPDATE fixed_assets 
        SET asset_account_id = NULL 
        WHERE asset_account_id = target_account_id;
        
        UPDATE fixed_assets 
        SET depreciation_account_id = NULL 
        WHERE depreciation_account_id = target_account_id;
        
        cleanup_log := array_append(cleanup_log, 
            format('Unlinked %s fixed assets from account', fixed_assets_count));
    END IF;
    
    -- Count and clean budget items references
    SELECT COUNT(*) INTO budget_items_count
    FROM budget_items 
    WHERE account_id = target_account_id;
    
    IF budget_items_count > 0 THEN
        -- Delete budget items that reference this account
        DELETE FROM budget_items 
        WHERE account_id = target_account_id;
        
        cleanup_log := array_append(cleanup_log, 
            format('Deleted %s budget items for account', budget_items_count));
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'fixed_assets_cleaned', fixed_assets_count,
        'budget_items_cleaned', budget_items_count,
        'cleanup_actions', cleanup_log
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'fixed_assets_cleaned', 0,
            'budget_items_cleaned', 0,
            'cleanup_actions', ARRAY[]::TEXT[]
        );
END;
$function$;

-- Enhanced account deletion that handles all constraints
CREATE OR REPLACE FUNCTION public.enhanced_complete_account_deletion(
    target_company_id uuid,
    include_system_accounts boolean DEFAULT false,
    include_inactive_accounts boolean DEFAULT false,
    force_complete_reset boolean DEFAULT false,
    deletion_reason text DEFAULT 'Enhanced bulk deletion'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    start_time TIMESTAMP := now();
    account_record RECORD;
    deleted_count INTEGER := 0;
    system_deleted_count INTEGER := 0;
    inactive_deleted_count INTEGER := 0;
    deactivated_count INTEGER := 0;
    failed_count INTEGER := 0;
    total_processed INTEGER := 0;
    success_details JSON[] := '{}';
    error_details JSON[] := '{}';
    operation_result TEXT;
    error_message TEXT;
    cleanup_result JSON;
    has_journal_entries BOOLEAN;
BEGIN
    -- Process each account individually
    FOR account_record IN 
        SELECT id, account_code, account_name, is_system, is_active
        FROM chart_of_accounts
        WHERE company_id = target_company_id 
        AND (is_active = true OR include_inactive_accounts)
        ORDER BY account_level DESC, account_code -- Start with leaf accounts
    LOOP
        total_processed := total_processed + 1;
        operation_result := 'unknown';
        error_message := NULL;
        
        BEGIN
            -- Skip system accounts if not forced
            IF account_record.is_system AND NOT include_system_accounts THEN
                operation_result := 'skipped_system';
                error_message := 'System account - skipped';
                CONTINUE;
            END IF;
            
            -- Check for journal entries
            SELECT EXISTS(
                SELECT 1 FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE jel.account_id = account_record.id
                AND je.status = 'posted'
            ) INTO has_journal_entries;
            
            -- If has journal entries, only deactivate
            IF has_journal_entries AND NOT force_complete_reset THEN
                UPDATE chart_of_accounts 
                SET is_active = false, updated_at = now() 
                WHERE id = account_record.id;
                
                deactivated_count := deactivated_count + 1;
                operation_result := 'deactivated';
                error_message := 'Has journal entries - deactivated';
            ELSE
                -- Clean up all references first
                SELECT * INTO cleanup_result 
                FROM safe_cleanup_account_references(account_record.id);
                
                -- Now delete the account
                DELETE FROM chart_of_accounts WHERE id = account_record.id;
                
                -- Count by type
                IF account_record.is_system THEN
                    system_deleted_count := system_deleted_count + 1;
                ELSIF NOT account_record.is_active THEN
                    inactive_deleted_count := inactive_deleted_count + 1;
                ELSE
                    deleted_count := deleted_count + 1;
                END IF;
                
                operation_result := 'deleted';
                error_message := 'Successfully deleted with cleanup: ' || 
                    COALESCE((cleanup_result->>'cleanup_actions')::text, '[]');
            END IF;
            
            -- Log successful operation
            INSERT INTO account_deletion_log (
                company_id,
                deleted_account_id,
                deleted_account_code,
                deleted_account_name,
                deletion_type,
                deletion_reason,
                deleted_by
            ) VALUES (
                target_company_id,
                account_record.id,
                account_record.account_code,
                account_record.account_name,
                operation_result,
                deletion_reason || ' - ' || error_message,
                auth.uid()
            );
            
            -- Add to success details
            success_details := success_details || json_build_object(
                'account_code', COALESCE(account_record.account_code, 'N/A'),
                'account_name', account_record.account_name,
                'action', operation_result,
                'reason', error_message,
                'is_system', account_record.is_system
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_count := failed_count + 1;
                error_message := SQLERRM;
                
                error_details := error_details || json_build_object(
                    'account_code', COALESCE(account_record.account_code, 'N/A'),
                    'account_name', account_record.account_name,
                    'error', error_message,
                    'is_system', account_record.is_system
                );
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Processed %s accounts: %s deleted, %s system deleted, %s inactive deleted, %s deactivated, %s failed', 
                         total_processed, deleted_count, system_deleted_count, inactive_deleted_count, deactivated_count, failed_count),
        'deleted_count', deleted_count,
        'system_deleted_count', system_deleted_count,
        'inactive_deleted_count', inactive_deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'total_processed', total_processed,
        'success_details', success_details,
        'error_details', error_details,
        'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds',
        'settings_used', json_build_object(
            'include_system_accounts', include_system_accounts,
            'include_inactive_accounts', include_inactive_accounts,
            'force_complete_reset', force_complete_reset
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Enhanced deletion failed',
            'deleted_count', deleted_count,
            'system_deleted_count', system_deleted_count,
            'inactive_deleted_count', inactive_deleted_count,
            'deactivated_count', deactivated_count,
            'failed_count', failed_count,
            'total_processed', total_processed,
            'success_details', success_details,
            'error_details', error_details,
            'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds'
        );
END;
$function$;