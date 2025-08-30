-- Function to delete all accounts in a company (DANGEROUS OPERATION)
CREATE OR REPLACE FUNCTION public.delete_all_accounts(
    company_id_param uuid,
    force_delete_system boolean DEFAULT false,
    confirmation_text text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_accounts integer := 0;
    system_accounts integer := 0;
    accounts_with_transactions integer := 0;
    deleted_permanently integer := 0;
    deleted_soft integer := 0;
    account_record RECORD;
    deletion_summary jsonb := '[]'::jsonb;
BEGIN
    -- Security check: Require exact confirmation text
    IF confirmation_text != 'DELETE ALL ACCOUNTS PERMANENTLY' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid confirmation text. Must be exactly: DELETE ALL ACCOUNTS PERMANENTLY',
            'summary', '{}'::jsonb
        );
    END IF;
    
    -- Count total accounts
    SELECT COUNT(*) INTO total_accounts
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- Count system accounts
    SELECT COUNT(*) INTO system_accounts
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true AND is_system = true;
    
    -- Count accounts with transactions
    SELECT COUNT(DISTINCT coa.id) INTO accounts_with_transactions
    FROM public.chart_of_accounts coa
    INNER JOIN public.journal_entry_lines jel ON coa.id = jel.account_id
    WHERE coa.company_id = company_id_param AND coa.is_active = true;
    
    -- If system accounts exist and force_delete_system is false, return error
    IF system_accounts > 0 AND force_delete_system = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Cannot delete %s system accounts. Set force_delete_system=true to override.', system_accounts),
            'summary', jsonb_build_object(
                'total_accounts', total_accounts,
                'system_accounts', system_accounts,
                'accounts_with_transactions', accounts_with_transactions
            )
        );
    END IF;
    
    -- Process each account
    FOR account_record IN 
        SELECT * FROM public.chart_of_accounts 
        WHERE company_id = company_id_param AND is_active = true
        ORDER BY account_level DESC -- Delete from deepest level first
    LOOP
        -- Check if account has transactions
        IF EXISTS (
            SELECT 1 FROM public.journal_entry_lines 
            WHERE account_id = account_record.id
            LIMIT 1
        ) THEN
            -- Soft delete (deactivate)
            UPDATE public.chart_of_accounts
            SET is_active = false, updated_at = now()
            WHERE id = account_record.id;
            
            deleted_soft := deleted_soft + 1;
            
            -- Add to summary
            deletion_summary := deletion_summary || jsonb_build_array(
                jsonb_build_object(
                    'id', account_record.id,
                    'account_code', account_record.account_code,
                    'account_name', account_record.account_name,
                    'deletion_type', 'soft',
                    'reason', 'has_transactions'
                )
            );
        ELSE
            -- Hard delete
            DELETE FROM public.chart_of_accounts
            WHERE id = account_record.id;
            
            deleted_permanently := deleted_permanently + 1;
            
            -- Add to summary
            deletion_summary := deletion_summary || jsonb_build_array(
                jsonb_build_object(
                    'id', account_record.id,
                    'account_code', account_record.account_code,
                    'account_name', account_record.account_name,
                    'deletion_type', 'permanent',
                    'reason', 'no_transactions'
                )
            );
        END IF;
    END LOOP;
    
    -- Return success with summary
    RETURN jsonb_build_object(
        'success', true,
        'summary', jsonb_build_object(
            'total_processed', total_accounts,
            'deleted_permanently', deleted_permanently,
            'deleted_soft', deleted_soft,
            'system_accounts_deleted', CASE WHEN force_delete_system THEN system_accounts ELSE 0 END,
            'accounts_with_transactions', accounts_with_transactions
        ),
        'detailed_deletions', deletion_summary
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Database error: %s', SQLERRM),
            'summary', '{}'::jsonb
        );
END;
$$;

-- Function to get deletion preview for all accounts
CREATE OR REPLACE FUNCTION public.get_all_accounts_deletion_preview(
    company_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_accounts integer := 0;
    system_accounts integer := 0;
    accounts_with_transactions integer := 0;
    accounts_without_transactions integer := 0;
    preview_accounts jsonb := '[]'::jsonb;
    account_record RECORD;
BEGIN
    -- Count totals
    SELECT COUNT(*) INTO total_accounts
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    SELECT COUNT(*) INTO system_accounts
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true AND is_system = true;
    
    SELECT COUNT(DISTINCT coa.id) INTO accounts_with_transactions
    FROM public.chart_of_accounts coa
    INNER JOIN public.journal_entry_lines jel ON coa.id = jel.account_id
    WHERE coa.company_id = company_id_param AND coa.is_active = true;
    
    accounts_without_transactions := total_accounts - accounts_with_transactions;
    
    -- Get sample accounts for preview
    FOR account_record IN 
        SELECT 
            coa.*,
            CASE WHEN jel.account_id IS NOT NULL THEN true ELSE false END as has_transactions
        FROM public.chart_of_accounts coa
        LEFT JOIN (
            SELECT DISTINCT account_id 
            FROM public.journal_entry_lines
        ) jel ON coa.id = jel.account_id
        WHERE coa.company_id = company_id_param AND coa.is_active = true
        ORDER BY coa.account_level, coa.account_code
        LIMIT 50  -- Show first 50 for preview
    LOOP
        preview_accounts := preview_accounts || jsonb_build_array(
            jsonb_build_object(
                'id', account_record.id,
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'account_level', account_record.account_level,
                'is_system', account_record.is_system,
                'has_transactions', account_record.has_transactions,
                'will_be_deleted_permanently', NOT account_record.has_transactions,
                'deletion_type', CASE WHEN account_record.has_transactions THEN 'soft' ELSE 'permanent' END
            )
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'summary', jsonb_build_object(
            'total_accounts', total_accounts,
            'system_accounts', system_accounts,
            'accounts_with_transactions', accounts_with_transactions,
            'accounts_without_transactions', accounts_without_transactions,
            'will_be_deleted_permanently', accounts_without_transactions,
            'will_be_deleted_soft', accounts_with_transactions
        ),
        'preview_accounts', preview_accounts,
        'showing_sample', CASE WHEN total_accounts > 50 THEN true ELSE false END
    );
END;
$$;