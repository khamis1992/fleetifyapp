-- Drop the conflicting old function
DROP FUNCTION IF EXISTS public.get_all_accounts_deletion_preview(uuid);

-- Ensure only the correct function exists with proper parameters
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
    total_accounts INTEGER := 0;
    system_accounts INTEGER := 0;
    with_entries INTEGER := 0;
    result jsonb;
BEGIN
    -- Count total accounts
    SELECT COUNT(*) INTO total_accounts
    FROM chart_of_accounts
    WHERE company_id = target_company_id AND is_active = true;
    
    -- Count system accounts
    SELECT COUNT(*) INTO system_accounts
    FROM chart_of_accounts
    WHERE company_id = target_company_id 
    AND is_active = true 
    AND is_system = true;
    
    -- Count accounts with journal entries
    SELECT COUNT(DISTINCT coa.id) INTO with_entries
    FROM chart_of_accounts coa
    INNER JOIN journal_entry_lines jel ON coa.id = jel.account_id
    INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.company_id = target_company_id 
    AND coa.is_active = true
    AND je.status = 'posted';
    
    -- Build result
    result := jsonb_build_object(
        'can_delete', total_accounts > 0,
        'total_accounts', total_accounts,
        'system_accounts', system_accounts,
        'accounts_with_entries', with_entries,
        'warnings', CASE 
            WHEN system_accounts > 0 AND NOT force_delete_system THEN 
                jsonb_build_array('يوجد حسابات نظام لن يتم حذفها إلا مع تفعيل الحذف القسري')
            ELSE 
                jsonb_build_array()
        END,
        'estimated_deletions', CASE 
            WHEN force_delete_system THEN total_accounts
            ELSE total_accounts - system_accounts
        END
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'can_delete', false
        );
END;
$function$;