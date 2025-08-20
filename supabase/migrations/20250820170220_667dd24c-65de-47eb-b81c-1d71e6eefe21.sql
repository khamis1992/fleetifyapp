-- Fix the comprehensive_delete_account function to match the actual table structure
DROP FUNCTION IF EXISTS public.comprehensive_delete_account(uuid, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.comprehensive_delete_account(
    account_id_param uuid,
    deletion_mode text DEFAULT 'soft',
    transfer_to_account_id_param uuid DEFAULT NULL,
    user_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_info record;
    analysis_result jsonb;
    affected_records_data jsonb := '[]'::jsonb;
    deletion_log_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Get account information first
    SELECT * INTO account_info
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account not found',
            'can_delete', false,
            'account_info', null,
            'affected_tables', '[]'::jsonb,
            'deletion_impact', 'unknown',
            'dependencies_count', 0
        );
    END IF;
    
    -- First analyze dependencies
    SELECT public.analyze_account_dependencies(account_id_param) INTO analysis_result;
    
    -- If analysis failed, return the error
    IF (analysis_result->>'success')::boolean = false THEN
        RETURN analysis_result;
    END IF;
    
    -- Check if account can be deleted based on analysis
    IF NOT (analysis_result->>'can_delete')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account cannot be deleted due to dependencies or system restrictions',
            'can_delete', false,
            'account_info', analysis_result->'account_info',
            'affected_tables', analysis_result->'affected_tables',
            'deletion_impact', analysis_result->'deletion_impact',
            'dependencies_count', analysis_result->'dependencies_count'
        );
    END IF;
    
    -- Prepare affected records data
    affected_records_data := analysis_result->'affected_tables';
    
    -- Create deletion log entry
    INSERT INTO public.account_deletion_log (
        company_id,
        deleted_account_id,
        deleted_account_code,
        deleted_account_name,
        deletion_type,
        transfer_to_account_id,
        affected_records,
        deleted_by,
        deletion_reason
    ) VALUES (
        account_info.company_id,
        account_info.id,
        account_info.account_code,
        account_info.account_name,
        deletion_mode,
        transfer_to_account_id_param,
        affected_records_data,
        current_user_id,
        CASE deletion_mode
            WHEN 'soft' THEN 'Soft deletion - account deactivated'
            WHEN 'transfer' THEN 'Transfer deletion - dependencies moved to another account'
            WHEN 'force' THEN 'Force deletion - account and dependencies permanently removed'
            ELSE 'Standard deletion'
        END
    ) RETURNING id INTO deletion_log_id;
    
    -- Perform the actual deletion based on mode
    CASE deletion_mode
        WHEN 'soft' THEN
            -- Soft delete: just deactivate the account
            UPDATE public.chart_of_accounts
            SET is_active = false,
                updated_at = now()
            WHERE id = account_id_param;
            
        WHEN 'transfer' THEN
            -- Transfer mode: move dependencies to another account
            IF transfer_to_account_id_param IS NULL THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Transfer account ID required for transfer deletion mode',
                    'can_delete', false,
                    'account_info', analysis_result->'account_info',
                    'affected_tables', analysis_result->'affected_tables',
                    'deletion_impact', analysis_result->'deletion_impact',
                    'dependencies_count', analysis_result->'dependencies_count'
                );
            END IF;
            
            -- Update journal entry lines
            UPDATE public.journal_entry_lines
            SET account_id = transfer_to_account_id_param
            WHERE account_id = account_id_param;
            
            -- Update budget items
            UPDATE public.budget_items
            SET account_id = transfer_to_account_id_param
            WHERE account_id = account_id_param;
            
            -- Update child accounts' parent
            UPDATE public.chart_of_accounts
            SET parent_account_id = transfer_to_account_id_param
            WHERE parent_account_id = account_id_param;
            
            -- Now delete the account
            DELETE FROM public.chart_of_accounts
            WHERE id = account_id_param;
            
        WHEN 'force' THEN
            -- Force delete: remove dependencies and account
            -- Delete child accounts first
            DELETE FROM public.chart_of_accounts
            WHERE parent_account_id = account_id_param;
            
            -- Delete journal entry lines
            DELETE FROM public.journal_entry_lines
            WHERE account_id = account_id_param;
            
            -- Delete budget items
            DELETE FROM public.budget_items
            WHERE account_id = account_id_param;
            
            -- Finally delete the account
            DELETE FROM public.chart_of_accounts
            WHERE id = account_id_param;
            
        ELSE
            -- Default: soft delete
            UPDATE public.chart_of_accounts
            SET is_active = false,
                updated_at = now()
            WHERE id = account_id_param;
    END CASE;
    
    -- Return success result
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account deleted successfully',
        'deletion_mode', deletion_mode,
        'deletion_log_id', deletion_log_id,
        'account_info', analysis_result->'account_info',
        'affected_tables', analysis_result->'affected_tables',
        'deletion_impact', analysis_result->'deletion_impact',
        'dependencies_count', analysis_result->'dependencies_count'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any changes and return error
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Deletion failed: ' || SQLERRM,
            'can_delete', false,
            'account_info', null,
            'affected_tables', '[]'::jsonb,
            'deletion_impact', 'unknown',
            'dependencies_count', 0
        );
END;
$function$;