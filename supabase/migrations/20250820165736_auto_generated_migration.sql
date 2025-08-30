-- Fix the analyze_account_dependencies function to resolve ambiguous column references
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
    temp_table_info jsonb;
    table_record record;
    column_record record;
    dependency_record record;
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
    SELECT COUNT(*) INTO dependencies_count
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = account_id_param;
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'journal_entry_lines',
            'record_count', dependencies_count,
            'description', 'Journal entry lines referencing this account'
        );
    END IF;
    
    -- Budget items
    SELECT COUNT(*) INTO dependencies_count
    FROM public.budget_items bi
    WHERE bi.account_id = account_id_param;
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'budget_items',
            'record_count', dependencies_count,
            'description', 'Budget items using this account'
        );
    END IF;
    
    -- Customers with this account
    SELECT COUNT(*) INTO dependencies_count
    FROM public.customers c
    WHERE c.account_id = account_id_param;
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'customers',
            'record_count', dependencies_count,
            'description', 'Customers linked to this account'
        );
    END IF;
    
    -- Contracts with this account
    SELECT COUNT(*) INTO dependencies_count
    FROM public.contracts con
    WHERE con.account_id = account_id_param;
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'contracts',
            'record_count', dependencies_count,
            'description', 'Contracts using this account'
        );
    END IF;
    
    -- Invoices with this account
    SELECT COUNT(*) INTO dependencies_count
    FROM public.invoices inv
    WHERE inv.account_id = account_id_param;
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'invoices',
            'record_count', dependencies_count,
            'description', 'Invoices linked to this account'
        );
    END IF;
    
    -- Payments with this account
    SELECT COUNT(*) INTO dependencies_count
    FROM public.payments p
    WHERE p.account_id = account_id_param;
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'payments',
            'record_count', dependencies_count,
            'description', 'Payments using this account'
        );
    END IF;
    
    -- Bank transactions
    SELECT COUNT(*) INTO dependencies_count
    FROM public.bank_transactions bt
    JOIN public.banks b ON bt.bank_id = b.id
    WHERE b.id IN (
        SELECT banks.id FROM public.banks 
        WHERE banks.company_id = account_info.id -- This might need adjustment based on your schema
    );
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'bank_transactions',
            'record_count', dependencies_count,
            'description', 'Bank transactions related to this account'
        );
    END IF;
    
    -- Child accounts
    SELECT COUNT(*) INTO dependencies_count
    FROM public.chart_of_accounts child_coa
    WHERE child_coa.parent_account_id = account_id_param;
    
    IF dependencies_count > 0 THEN
        affected_tables := affected_tables || jsonb_build_object(
            'table_name', 'chart_of_accounts',
            'record_count', dependencies_count,
            'description', 'Child accounts under this account'
        );
    END IF;
    
    -- Calculate total dependencies
    SELECT SUM((table_info->>'record_count')::integer) INTO dependencies_count
    FROM jsonb_array_elements(affected_tables) AS table_info;
    
    dependencies_count := COALESCE(dependencies_count, 0);
    
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