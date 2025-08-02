-- Fix ambiguous user_id reference in create_contract_journal_entry function
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
    contract_id_param uuid,
    company_id_param uuid,
    created_by_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    journal_entry_id uuid;
    entry_number text;
    revenue_account_id uuid;
    receivable_account_id uuid;
    current_user_id uuid;
BEGIN
    -- Get the user ID, prioritizing the parameter over auth.uid()
    current_user_id := COALESCE(created_by_user_id, auth.uid());
    
    -- Validate inputs
    IF contract_id_param IS NULL THEN
        RAISE EXCEPTION 'Contract ID cannot be null';
    END IF;
    
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID cannot be null';
    END IF;
    
    -- Get contract details with explicit table aliases
    SELECT 
        c.id,
        c.contract_number,
        c.contract_amount,
        c.monthly_amount,
        c.contract_type,
        c.customer_id,
        c.cost_center_id,
        c.created_by,
        c.company_id
    INTO contract_record
    FROM public.contracts c
    WHERE c.id = contract_id_param
    AND c.company_id = company_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', contract_id_param;
    END IF;
    
    -- Get revenue account from mappings
    SELECT am.chart_of_accounts_id INTO revenue_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = 'RENTAL_REVENUE'
    AND am.is_active = true
    LIMIT 1;
    
    -- Fallback to find any revenue account
    IF revenue_account_id IS NULL THEN
        SELECT coa.id INTO revenue_account_id
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.account_type = 'revenue'
        AND coa.is_active = true
        AND coa.is_header = false
        ORDER BY coa.account_code
        LIMIT 1;
    END IF;
    
    -- Get receivable account from customer account or mappings
    SELECT ca.account_id INTO receivable_account_id
    FROM public.customer_accounts ca
    WHERE ca.customer_id = contract_record.customer_id
    AND ca.company_id = company_id_param
    LIMIT 1;
    
    -- Fallback to get receivable account from mappings
    IF receivable_account_id IS NULL THEN
        SELECT am.chart_of_accounts_id INTO receivable_account_id
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param
        AND dat.type_code = 'RECEIVABLES'
        AND am.is_active = true
        LIMIT 1;
    END IF;
    
    -- Validate we have the required accounts
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No revenue account found for company';
    END IF;
    
    IF receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No receivable account found for customer or company';
    END IF;
    
    -- Generate entry number
    entry_number := 'CNT-JE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries je
        WHERE je.company_id = company_id_param 
        AND EXTRACT(YEAR FROM je.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        entry_number,
        CURRENT_DATE,
        'Contract revenue recognition for ' || contract_record.contract_number,
        'contract',
        contract_id_param,
        'posted',
        current_user_id
    ) RETURNING id INTO journal_entry_id;
    
    -- Create debit entry (Accounts Receivable)
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        receivable_account_id,
        'Contract receivable - ' || contract_record.contract_number,
        contract_record.contract_amount,
        0,
        contract_record.cost_center_id
    );
    
    -- Create credit entry (Revenue)
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        'Contract revenue - ' || contract_record.contract_number,
        0,
        contract_record.contract_amount,
        contract_record.cost_center_id
    );
    
    -- Update contract with journal entry reference
    UPDATE public.contracts 
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise with context
        RAISE EXCEPTION 'Failed to create contract journal entry for contract %: %', contract_id_param, SQLERRM;
END;
$function$;

-- Fix create_contract_safe function to ensure consistent JSON responses
CREATE OR REPLACE FUNCTION public.create_contract_safe(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    contract_id uuid;
    journal_entry_id uuid;
    validation_result jsonb;
    current_user_id uuid;
    company_id_value uuid;
    error_context text := '';
BEGIN
    -- Get current user and company
    current_user_id := auth.uid();
    company_id_value := (contract_data->>'company_id')::uuid;
    
    -- Log contract creation start
    PERFORM log_contract_creation_step(
        company_id_value,
        NULL,
        'contract_creation_start',
        'started',
        NULL,
        jsonb_build_object('user_id', current_user_id, 'contract_data_keys', jsonb_object_keys(contract_data))
    );
    
    BEGIN
        -- Validate contract data
        error_context := 'validation';
        validation_result := validate_contract_data(contract_data);
        
        IF NOT (validation_result->>'valid')::boolean THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Validation failed',
                'details', validation_result->'errors',
                'step', 'validation'
            );
        END IF;
        
        -- Create the contract
        error_context := 'contract_insertion';
        INSERT INTO public.contracts (
            id,
            company_id,
            customer_id,
            vehicle_id,
            contract_number,
            contract_type,
            contract_amount,
            monthly_amount,
            start_date,
            end_date,
            terms_conditions,
            status,
            cost_center_id,
            account_id,
            created_by
        ) VALUES (
            gen_random_uuid(),
            company_id_value,
            (contract_data->>'customer_id')::uuid,
            NULLIF(contract_data->>'vehicle_id', 'none')::uuid,
            contract_data->>'contract_number',
            contract_data->>'contract_type',
            (contract_data->>'contract_amount')::numeric,
            (contract_data->>'monthly_amount')::numeric,
            (contract_data->>'start_date')::date,
            (contract_data->>'end_date')::date,
            contract_data->>'terms_conditions',
            'draft',
            (contract_data->>'cost_center_id')::uuid,
            (contract_data->>'account_id')::uuid,
            current_user_id
        ) RETURNING id INTO contract_id;
        
        -- Log contract creation success
        PERFORM log_contract_creation_step(
            company_id_value,
            contract_id,
            'contract_insertion',
            'completed',
            NULL,
            jsonb_build_object('contract_id', contract_id)
        );
        
        -- Create journal entry
        error_context := 'journal_entry_creation';
        journal_entry_id := create_contract_journal_entry(contract_id, company_id_value, current_user_id);
        
        -- Log journal entry creation success
        PERFORM log_contract_creation_step(
            company_id_value,
            contract_id,
            'journal_entry_creation',
            'completed',
            NULL,
            jsonb_build_object('journal_entry_id', journal_entry_id)
        );
        
        -- Return success response
        result := jsonb_build_object(
            'success', true,
            'contract_id', contract_id,
            'journal_entry_id', journal_entry_id,
            'message', 'Contract created successfully'
        );
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the specific error
            PERFORM log_contract_creation_step(
                company_id_value,
                contract_id,
                error_context,
                'failed',
                SQLERRM,
                jsonb_build_object('error_code', SQLSTATE, 'error_context', error_context)
            );
            
            -- Return consistent error response
            RETURN jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'error_code', SQLSTATE,
                'step', error_context,
                'contract_id', contract_id
            );
    END;
END;
$function$;