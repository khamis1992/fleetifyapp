-- Update the validate_chart_hierarchy function to return detailed account information
CREATE OR REPLACE FUNCTION public.validate_chart_hierarchy(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"is_valid": true, "issues": {}, "total_issues": 0, "details": {}}'::jsonb;
    orphaned_count integer := 0;
    circular_count integer := 0;
    incorrect_levels_count integer := 0;
    duplicate_codes_count integer := 0;
    missing_parents_count integer := 0;
    total_count integer := 0;
    orphaned_accounts jsonb := '[]'::jsonb;
    duplicate_accounts jsonb := '[]'::jsonb;
    incorrect_level_accounts jsonb := '[]'::jsonb;
BEGIN
    -- Find orphaned accounts (accounts with parent_account_id that doesn't exist)
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', coa.id,
        'account_code', coa.account_code,
        'account_name', coa.account_name,
        'account_name_ar', coa.account_name_ar,
        'parent_account_id', coa.parent_account_id
    ))
    INTO orphaned_count, orphaned_accounts
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND coa.parent_account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts parent_coa
        WHERE parent_coa.id = coa.parent_account_id
        AND parent_coa.company_id = company_id_param
        AND parent_coa.is_active = true
    );

    -- Find duplicate account codes
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'account_code', account_code,
        'accounts', accounts_data
    ))
    INTO duplicate_codes_count, duplicate_accounts
    FROM (
        SELECT 
            coa.account_code,
            jsonb_agg(jsonb_build_object(
                'id', coa.id,
                'account_name', coa.account_name,
                'account_name_ar', coa.account_name_ar
            )) as accounts_data
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.is_active = true
        GROUP BY coa.account_code
        HAVING COUNT(*) > 1
    ) duplicates;

    -- Find accounts with incorrect levels
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', coa.id,
        'account_code', coa.account_code,
        'account_name', coa.account_name,
        'account_name_ar', coa.account_name_ar,
        'current_level', coa.account_level,
        'expected_level', CASE 
            WHEN coa.parent_account_id IS NULL THEN 1
            ELSE COALESCE(parent_coa.account_level, 0) + 1
        END
    ))
    INTO incorrect_levels_count, incorrect_level_accounts
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND (
        (coa.parent_account_id IS NULL AND coa.account_level != 1) OR
        (coa.parent_account_id IS NOT NULL AND coa.account_level != COALESCE(parent_coa.account_level, 0) + 1)
    );

    -- Calculate total issues
    total_count := orphaned_count + duplicate_codes_count + incorrect_levels_count;

    -- Build result
    validation_result := jsonb_build_object(
        'is_valid', total_count = 0,
        'total_issues', total_count,
        'issues', jsonb_build_object(
            'orphaned_accounts', orphaned_count,
            'circular_references', circular_count,
            'incorrect_levels', incorrect_levels_count,
            'duplicate_codes', duplicate_codes_count,
            'missing_parents', missing_parents_count
        ),
        'details', jsonb_build_object(
            'orphaned_accounts', COALESCE(orphaned_accounts, '[]'::jsonb),
            'duplicate_codes', COALESCE(duplicate_accounts, '[]'::jsonb),
            'incorrect_levels', COALESCE(incorrect_level_accounts, '[]'::jsonb)
        )
    );

    RETURN validation_result;
END;
$function$;