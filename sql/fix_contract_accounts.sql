-- Function to ensure essential accounts exist for contract creation
CREATE OR REPLACE FUNCTION public.ensure_contract_accounts(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"success": false, "accounts_created": [], "accounts_found": [], "errors": []}'::jsonb;
    revenue_account_id uuid;
    receivables_account_id uuid;
    accounts_created text[] := '{}';
    accounts_found text[] := '{}';
    errors text[] := '{}';
BEGIN
    -- Check for existing revenue account
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'revenue'
    AND is_active = true
    AND is_header = false
    LIMIT 1;

    -- Check for existing receivables account
    SELECT id INTO receivables_account_id
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
    AND is_active = true
    AND is_header = false
    LIMIT 1;

    -- Create revenue account if missing
    IF revenue_account_id IS NULL THEN
        BEGIN
            INSERT INTO public.chart_of_accounts (
                company_id,
                account_code,
                account_name,
                account_name_en,
                account_type,
                is_active,
                is_header,
                account_level,
                created_at
            ) VALUES (
                company_id_param,
                '4101',
                'إيرادات تأجير المركبات',
                'Vehicle Rental Revenue',
                'revenue',
                true,
                false,
                2,
                now()
            ) RETURNING id INTO revenue_account_id;

            accounts_created := array_append(accounts_created, 'Revenue Account');
            
        EXCEPTION WHEN OTHERS THEN
            errors := array_append(errors, 'Failed to create revenue account: ' || SQLERRM);
        END;
    ELSE
        accounts_found := array_append(accounts_found, 'Revenue Account');
    END IF;

    -- Create receivables account if missing
    IF receivables_account_id IS NULL THEN
        BEGIN
            INSERT INTO public.chart_of_accounts (
                company_id,
                account_code,
                account_name,
                account_name_en,
                account_type,
                is_active,
                is_header,
                account_level,
                created_at
            ) VALUES (
                company_id_param,
                '1201',
                'ذمم العملاء',
                'Accounts Receivable',
                'assets',
                true,
                false,
                2,
                now()
            ) RETURNING id INTO receivables_account_id;

            accounts_created := array_append(accounts_created, 'Receivables Account');
            
        EXCEPTION WHEN OTHERS THEN
            errors := array_append(errors, 'Failed to create receivables account: ' || SQLERRM);
        END;
    ELSE
        accounts_found := array_append(accounts_found, 'Receivables Account');
    END IF;

    -- Build result
    result := jsonb_build_object(
        'success', array_length(errors, 1) IS NULL OR array_length(errors, 1) = 0,
        'accounts_created', to_jsonb(accounts_created),
        'accounts_found', to_jsonb(accounts_found),
        'errors', to_jsonb(errors),
        'revenue_account_id', revenue_account_id,
        'receivables_account_id', receivables_account_id
    );

    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.ensure_contract_accounts(uuid) TO authenticated;

-- Create helper function to get mapped account with better error handling
CREATE OR REPLACE FUNCTION public.get_mapped_account_enhanced(
    company_id_param uuid,
    account_type_code_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id uuid;
BEGIN
    -- First try to get from account mappings
    SELECT am.chart_of_accounts_id INTO account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = account_type_code_param
    AND am.is_active = true
    LIMIT 1;

    -- If not found in mappings, try direct account lookup
    IF account_id IS NULL THEN
        CASE account_type_code_param
            WHEN 'RECEIVABLES' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'assets'
                AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
                AND is_active = true
                AND is_header = false
                LIMIT 1;
                
            WHEN 'RENTAL_REVENUE', 'SALES_REVENUE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'revenue'
                AND is_active = true
                AND is_header = false
                LIMIT 1;
        END CASE;
    END IF;

    RETURN account_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_mapped_account_enhanced(uuid, text) TO authenticated;