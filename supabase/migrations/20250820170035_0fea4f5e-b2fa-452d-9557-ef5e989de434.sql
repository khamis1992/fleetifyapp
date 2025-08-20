-- Fix the analyze_account_dependencies function to only check existing columns
DROP FUNCTION IF EXISTS public.analyze_account_dependencies(uuid);

CREATE OR REPLACE FUNCTION public.analyze_account_dependencies(account_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_info record;
    dependencies_count integer := 0;
    affected_tables jsonb := '[]'::jsonb;
    temp_count integer;
BEGIN
    -- Get account information
    SELECT coa.id, coa.account_code, coa.account_name, coa.account_name_ar, 
           coa.account_type, coa.is_header, coa.is_system, coa.current_balance
    INTO account_info
    FROM public.chart_of_accounts coa
    WHERE coa.id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account not found',
            'account_info', null,
            'dependencies_count', 0,
            'affected_tables', '[]'::jsonb,
            'can_delete', false,
            'deletion_impact', 'high'
        );
    END IF;
    
    -- Check for dependencies in various tables
    -- Journal entry lines
    SELECT COUNT(*) INTO temp_count
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = account_id_param;
    
    IF temp_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'journal_entry_lines',
            'record_count', temp_count,
            'description', 'Journal entry lines referencing this account'
        );
        dependencies_count := dependencies_count + temp_count;
    END IF;
    
    -- Budget items
    SELECT COUNT(*) INTO temp_count
    FROM public.budget_items bi
    WHERE bi.account_id = account_id_param;
    
    IF temp_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'budget_items',
            'record_count', temp_count,
            'description', 'Budget items using this account'
        );
        dependencies_count := dependencies_count + temp_count;
    END IF;
    
    -- Child accounts
    SELECT COUNT(*) INTO temp_count
    FROM public.chart_of_accounts child_coa
    WHERE child_coa.parent_account_id = account_id_param;
    
    IF temp_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'chart_of_accounts',
            'record_count', temp_count,
            'description', 'Child accounts under this account'
        );
        dependencies_count := dependencies_count + temp_count;
    END IF;
    
    -- Check if banks table has account reference (check if column exists first)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'banks' 
        AND column_name = 'account_id'
    ) THEN
        SELECT COUNT(*) INTO temp_count
        FROM public.banks b
        WHERE b.account_id = account_id_param;
        
        IF temp_count > 0 THEN
            affected_tables := affected_tables || jsonb_build_object(
                'table_name', 'banks',
                'record_count', temp_count,
                'description', 'Bank accounts linked to this account'
            );
            dependencies_count := dependencies_count + temp_count;
        END IF;
    END IF;
    
    -- Determine deletion impact and capability
    RETURN jsonb_build_object(
        'success', true,
        'account_info', jsonb_build_object(
            'id', account_info.id,
            'account_code', account_info.account_code,
            'account_name', account_info.account_name,
            'account_name_ar', account_info.account_name_ar,
            'account_type', account_info.account_type,
            'is_header', account_info.is_header,
            'is_system', account_info.is_system,
            'current_balance', account_info.current_balance
        ),
        'dependencies_count', dependencies_count,
        'affected_tables', affected_tables,
        'can_delete', CASE 
            WHEN account_info.is_system THEN false
            WHEN dependencies_count = 0 THEN true
            WHEN dependencies_count <= 5 THEN true
            ELSE false
        END,
        'deletion_impact', CASE 
            WHEN dependencies_count = 0 THEN 'low'
            WHEN dependencies_count <= 5 THEN 'medium'
            ELSE 'high'
        END,
        'recommendations', CASE
            WHEN account_info.is_system THEN '["Cannot delete system accounts"]'::jsonb
            WHEN dependencies_count > 10 THEN '["Consider transferring data to another account", "Review all affected records before deletion"]'::jsonb
            WHEN dependencies_count > 0 THEN '["Review affected records", "Consider data backup"]'::jsonb
            ELSE '["Safe to delete"]'::jsonb
        END
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Analysis failed: ' || SQLERRM,
            'account_info', null,
            'dependencies_count', 0,
            'affected_tables', '[]'::jsonb,
            'can_delete', false,
            'deletion_impact', 'unknown'
        );
END;
$function$;