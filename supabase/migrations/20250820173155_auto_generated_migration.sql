-- Update delete_all_accounts function to handle inactive accounts properly
CREATE OR REPLACE FUNCTION public.delete_all_accounts(
    target_company_id uuid,
    force_deletion boolean DEFAULT false,
    force_delete_system boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    deleted_count INTEGER := 0;
    failed_count INTEGER := 0;
    reactivated_count INTEGER := 0;
    failed_accounts jsonb := '[]'::jsonb;
    summary_result jsonb;
BEGIN
    -- First, reactivate all inactive accounts so they can be properly deleted
    UPDATE chart_of_accounts 
    SET is_active = true, updated_at = now()
    WHERE company_id = target_company_id 
    AND is_active = false;
    
    GET DIAGNOSTICS reactivated_count = ROW_COUNT;
    
    -- Delete accounts from highest level to lowest to avoid parent-child issues
    FOR account_record IN 
        SELECT id, account_code, account_name, is_system, account_level
        FROM chart_of_accounts 
        WHERE company_id = target_company_id 
        AND is_active = true
        ORDER BY account_level DESC, account_code DESC
    LOOP
        BEGIN
            -- Skip system accounts unless force_delete_system is true
            IF account_record.is_system = true AND force_delete_system = false THEN
                failed_accounts := failed_accounts || jsonb_build_object(
                    'account_code', account_record.account_code,
                    'account_name', account_record.account_name,
                    'reason', 'System account protection - use force delete option'
                );
                failed_count := failed_count + 1;
                CONTINUE;
            END IF;
            
            -- First try soft delete (mark as inactive)
            IF force_deletion = false THEN
                UPDATE chart_of_accounts 
                SET is_active = false, updated_at = now()
                WHERE id = account_record.id;
                
                deleted_count := deleted_count + 1;
            ELSE
                -- Force deletion - actually remove from database
                DELETE FROM chart_of_accounts 
                WHERE id = account_record.id;
                
                deleted_count := deleted_count + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            failed_accounts := failed_accounts || jsonb_build_object(
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'reason', SQLERRM
            );
            failed_count := failed_count + 1;
        END;
    END LOOP;
    
    -- Create summary result
    summary_result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'failed_count', failed_count,
        'reactivated_count', reactivated_count,
        'total_processed', deleted_count + failed_count,
        'failed_accounts', failed_accounts,
        'deletion_type', CASE WHEN force_deletion THEN 'permanent' ELSE 'soft' END,
        'system_accounts_deleted', force_delete_system
    );
    
    RETURN summary_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'deleted_count', deleted_count,
            'failed_count', failed_count
        );
END;
$function$;

-- Update get_all_accounts_deletion_preview function
CREATE OR REPLACE FUNCTION public.get_all_accounts_deletion_preview(
    target_company_id uuid,
    force_delete_system boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_accounts INTEGER;
    active_accounts INTEGER;
    inactive_accounts INTEGER;
    system_accounts INTEGER;
    deletable_accounts INTEGER;
    protected_accounts INTEGER;
    result jsonb;
    sample_accounts jsonb := '[]'::jsonb;
    account_record RECORD;
BEGIN
    -- Count all accounts
    SELECT COUNT(*) INTO total_accounts
    FROM chart_of_accounts 
    WHERE company_id = target_company_id;
    
    -- Count active accounts
    SELECT COUNT(*) INTO active_accounts
    FROM chart_of_accounts 
    WHERE company_id = target_company_id AND is_active = true;
    
    -- Count inactive accounts
    SELECT COUNT(*) INTO inactive_accounts
    FROM chart_of_accounts 
    WHERE company_id = target_company_id AND is_active = false;
    
    -- Count system accounts
    SELECT COUNT(*) INTO system_accounts
    FROM chart_of_accounts 
    WHERE company_id = target_company_id AND is_system = true;
    
    -- Count deletable accounts (considering force_delete_system flag)
    IF force_delete_system THEN
        deletable_accounts := total_accounts;
        protected_accounts := 0;
    ELSE
        SELECT COUNT(*) INTO deletable_accounts
        FROM chart_of_accounts 
        WHERE company_id = target_company_id AND is_system = false;
        
        protected_accounts := system_accounts;
    END IF;
    
    -- Get sample of accounts to be affected
    FOR account_record IN 
        SELECT account_code, account_name, is_system, is_active, account_level
        FROM chart_of_accounts 
        WHERE company_id = target_company_id
        ORDER BY account_level, account_code
        LIMIT 10
    LOOP
        sample_accounts := sample_accounts || jsonb_build_object(
            'account_code', account_record.account_code,
            'account_name', account_record.account_name,
            'is_system', account_record.is_system,
            'is_active', account_record.is_active,
            'will_be_deleted', (force_delete_system OR account_record.is_system = false)
        );
    END LOOP;
    
    result := jsonb_build_object(
        'total_accounts', total_accounts,
        'active_accounts', active_accounts,
        'inactive_accounts', inactive_accounts,
        'system_accounts', system_accounts,
        'deletable_accounts', deletable_accounts,
        'protected_accounts', protected_accounts,
        'sample_accounts', sample_accounts,
        'force_delete_system', force_delete_system,
        'warning_message', CASE 
            WHEN inactive_accounts > 0 THEN 
                'يوجد ' || inactive_accounts || ' حساب غير نشط سيتم إعادة تفعيله أولاً ثم حذفه'
            ELSE 'جميع الحسابات نشطة حالياً'
        END
    );
    
    RETURN result;
END;
$function$;