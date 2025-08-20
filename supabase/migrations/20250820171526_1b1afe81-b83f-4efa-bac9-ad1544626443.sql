-- Create enhanced delete_all_accounts function that handles foreign key constraints
CREATE OR REPLACE FUNCTION public.delete_all_accounts(
    company_id_param uuid,
    force_delete_system boolean DEFAULT false,
    confirmation_text text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
    deleted_accounts jsonb := '[]'::jsonb;
    account_record RECORD;
    error_details jsonb := '[]'::jsonb;
BEGIN
    -- Validate confirmation text
    IF confirmation_text IS NULL OR confirmation_text != 'DELETE ALL ACCOUNTS PERMANENTLY' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid confirmation text'
        );
    END IF;

    -- Log the operation start
    INSERT INTO public.account_deletion_log (
        company_id,
        deletion_type,
        deletion_reason,
        deleted_by
    ) VALUES (
        company_id_param,
        'delete_all',
        'Delete all accounts operation with confirmation: ' || confirmation_text,
        auth.uid()
    );

    -- First, handle foreign key constraints by nullifying references in fixed_assets
    BEGIN
        UPDATE public.fixed_assets 
        SET 
            depreciation_account_id = NULL,
            accumulated_depreciation_account_id = NULL,
            disposal_account_id = NULL
        WHERE company_id = company_id_param;
        
        RAISE NOTICE 'Fixed assets references nullified';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not update fixed_assets table: %', SQLERRM;
    END;

    -- Delete accounts in reverse dependency order (children first)
    FOR account_record IN 
        SELECT * FROM public.chart_of_accounts 
        WHERE company_id = company_id_param 
        AND (is_active = true OR is_active IS NULL)
        ORDER BY account_level DESC, account_code
    LOOP
        BEGIN
            -- Check if it's a system account and we don't have force permission
            IF account_record.is_system = true AND force_delete_system = false THEN
                -- Just deactivate system accounts
                UPDATE public.chart_of_accounts 
                SET is_active = false, updated_at = now()
                WHERE id = account_record.id;
                
                deleted_accounts := deleted_accounts || jsonb_build_object(
                    'account_code', account_record.account_code,
                    'account_name', account_record.account_name,
                    'action', 'deactivated'
                );
            ELSE
                -- Try to delete the account using comprehensive function
                BEGIN
                    -- Call the existing comprehensive delete function
                    PERFORM public.comprehensive_delete_account(
                        account_record.id,
                        true, -- force_delete
                        NULL  -- transfer_to_account_id
                    );
                    
                    deleted_accounts := deleted_accounts || jsonb_build_object(
                        'account_code', account_record.account_code,
                        'account_name', account_record.account_name,
                        'action', 'deleted'
                    );
                    
                    deleted_count := deleted_count + 1;
                    
                EXCEPTION WHEN OTHERS THEN
                    -- If comprehensive delete fails, try simple delete
                    BEGIN
                        DELETE FROM public.chart_of_accounts WHERE id = account_record.id;
                        
                        deleted_accounts := deleted_accounts || jsonb_build_object(
                            'account_code', account_record.account_code,
                            'account_name', account_record.account_name,
                            'action', 'force_deleted'
                        );
                        
                        deleted_count := deleted_count + 1;
                        
                    EXCEPTION WHEN OTHERS THEN
                        error_count := error_count + 1;
                        error_details := error_details || jsonb_build_object(
                            'account_code', account_record.account_code,
                            'account_name', account_record.account_name,
                            'error', SQLERRM
                        );
                        
                        RAISE WARNING 'Could not delete account %: %', account_record.account_code, SQLERRM;
                    END;
                END;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_details := error_details || jsonb_build_object(
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'error', SQLERRM
            );
            
            RAISE WARNING 'Error processing account %: %', account_record.account_code, SQLERRM;
        END;
    END LOOP;

    -- Return results
    RETURN jsonb_build_object(
        'success', true,
        'summary', jsonb_build_object(
            'total_processed', deleted_count + error_count,
            'deleted_count', deleted_count,
            'error_count', error_count
        ),
        'details', deleted_accounts,
        'errors', error_details
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM
    );
END;
$$;

-- Create the preview function as well
CREATE OR REPLACE FUNCTION public.get_all_accounts_deletion_preview(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_accounts INTEGER;
    system_accounts INTEGER;
    regular_accounts INTEGER;
    preview_accounts jsonb;
BEGIN
    -- Count accounts
    SELECT COUNT(*) INTO total_accounts
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    SELECT COUNT(*) INTO system_accounts
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true AND is_system = true;
    
    regular_accounts := total_accounts - system_accounts;
    
    -- Get preview of first 50 accounts
    SELECT jsonb_agg(
        jsonb_build_object(
            'account_code', account_code,
            'account_name', account_name,
            'account_type', account_type,
            'is_system', is_system,
            'deletion_type', CASE WHEN is_system THEN 'deactivate' ELSE 'delete' END
        )
    ) INTO preview_accounts
    FROM (
        SELECT account_code, account_name, account_type, is_system
        FROM public.chart_of_accounts
        WHERE company_id = company_id_param AND is_active = true
        ORDER BY account_code
        LIMIT 50
    ) AS preview;
    
    RETURN jsonb_build_object(
        'success', true,
        'summary', jsonb_build_object(
            'total_accounts', total_accounts,
            'system_accounts', system_accounts,
            'will_be_deleted_permanently', regular_accounts,
            'will_be_deleted_soft', system_accounts
        ),
        'preview_accounts', COALESCE(preview_accounts, '[]'::jsonb),
        'showing_sample', total_accounts > 50
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;