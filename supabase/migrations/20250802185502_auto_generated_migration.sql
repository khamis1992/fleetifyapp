-- Clean up existing create_contract_journal_entry functions
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, uuid, uuid, uuid, uuid);

-- Create unified and improved create_contract_journal_entry function
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
    contract_id_param uuid,
    user_id_param uuid DEFAULT NULL,
    override_receivables_account_id uuid DEFAULT NULL,
    override_revenue_account_id uuid DEFAULT NULL,
    force_recreate boolean DEFAULT false,
    custom_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    journal_entry_id uuid;
    journal_entry_number text;
    user_company_id uuid;
    receivables_account_id uuid;
    revenue_account_id uuid;
    current_user_id uuid;
    existing_journal_entry_id uuid;
    result jsonb;
    start_time timestamp := clock_timestamp();
BEGIN
    -- Get current user ID if not provided
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Get user's company ID with explicit column qualification
    SELECT profiles.company_id INTO user_company_id
    FROM public.profiles 
    WHERE profiles.user_id = current_user_id 
    LIMIT 1;
    
    IF user_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'USER_COMPANY_NOT_FOUND',
            'error_message', 'User company not found',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param
    AND status IN ('active', 'draft');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_NOT_FOUND',
            'error_message', 'Contract not found or not in valid status',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Verify contract belongs to user's company
    IF contract_record.company_id != user_company_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_COMPANY_MISMATCH',
            'error_message', 'Contract does not belong to user company',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Check if journal entry already exists
    SELECT journal_entry_id INTO existing_journal_entry_id
    FROM public.contracts
    WHERE id = contract_id_param
    AND journal_entry_id IS NOT NULL;
    
    IF existing_journal_entry_id IS NOT NULL AND NOT force_recreate THEN
        RETURN jsonb_build_object(
            'success', true,
            'journal_entry_id', existing_journal_entry_id,
            'action', 'existing_entry_found',
            'message', 'Journal entry already exists for this contract',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Get account mappings (use overrides if provided)
    IF override_receivables_account_id IS NOT NULL THEN
        receivables_account_id := override_receivables_account_id;
    ELSE
        SELECT am.chart_of_accounts_id INTO receivables_account_id
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = user_company_id
        AND dat.type_code = 'RECEIVABLES'
        AND am.is_active = true
        LIMIT 1;
    END IF;
    
    IF override_revenue_account_id IS NOT NULL THEN
        revenue_account_id := override_revenue_account_id;
    ELSE
        SELECT am.chart_of_accounts_id INTO revenue_account_id
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = user_company_id
        AND dat.type_code = CASE 
            WHEN contract_record.contract_type = 'rental' THEN 'RENTAL_REVENUE'
            ELSE 'SALES_REVENUE'
        END
        AND am.is_active = true
        LIMIT 1;
    END IF;
    
    -- Check if accounts are found
    IF receivables_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'RECEIVABLES_ACCOUNT_NOT_FOUND',
            'error_message', 'Receivables account mapping not found for company',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;

    IF revenue_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'REVENUE_ACCOUNT_NOT_FOUND',
            'error_message', 'Revenue account mapping not found for company and contract type: ' || contract_record.contract_type,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Generate journal entry number
    journal_entry_number := 'JE-CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = user_company_id 
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        created_by,
        status
    ) VALUES (
        user_company_id,
        journal_entry_number,
        contract_record.contract_date,
        COALESCE(custom_description, 'Contract Journal Entry - ' || contract_record.contract_number),
        'contract',
        contract_record.id,
        current_user_id,
        'posted'
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Receivables
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        cost_center_id
    ) VALUES (
        journal_entry_id,
        receivables_account_id,
        contract_record.contract_amount,
        0,
        'Contract Receivable - ' || contract_record.contract_number,
        contract_record.cost_center_id
    );
    
    -- Credit: Revenue
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        cost_center_id
    ) VALUES (
        journal_entry_id,
        revenue_account_id,
        0,
        contract_record.contract_amount,
        'Contract Revenue - ' || contract_record.contract_number,
        contract_record.cost_center_id
    );
    
    -- Update contract with journal entry reference
    UPDATE public.contracts
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    -- Build success result
    result := jsonb_build_object(
        'success', true,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', journal_entry_number,
        'action', CASE WHEN existing_journal_entry_id IS NOT NULL THEN 'recreated' ELSE 'created' END,
        'contract_id', contract_id_param,
        'contract_number', contract_record.contract_number,
        'contract_amount', contract_record.contract_amount,
        'receivables_account_id', receivables_account_id,
        'revenue_account_id', revenue_account_id,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM,
        'error_state', SQLSTATE,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
END;
$function$;

-- Create improved create_contract_safe function
CREATE OR REPLACE FUNCTION public.create_contract_safe(
    contract_data jsonb,
    user_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_id uuid;
    journal_result jsonb;
    validation_result jsonb;
    current_user_id uuid;
    start_time timestamp := clock_timestamp();
    result jsonb;
BEGIN
    -- Get current user ID
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Validate contract data
    validation_result := public.validate_contract_data(contract_data);
    
    IF NOT (validation_result->>'valid')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'VALIDATION_FAILED',
            'validation_errors', validation_result->'errors',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Create the contract
    INSERT INTO public.contracts (
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_type,
        contract_date,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        status,
        description,
        terms,
        created_by
    ) VALUES (
        (contract_data->>'company_id')::uuid,
        (contract_data->>'customer_id')::uuid,
        NULLIF(contract_data->>'vehicle_id', '')::uuid,
        contract_data->>'contract_number',
        contract_data->>'contract_type',
        (contract_data->>'contract_date')::date,
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        (contract_data->>'monthly_amount')::numeric,
        'draft',
        contract_data->>'description',
        contract_data->>'terms',
        current_user_id
    ) RETURNING id INTO contract_id;
    
    -- Create journal entry
    journal_result := public.create_contract_journal_entry(
        contract_id,
        current_user_id
    );
    
    IF NOT (journal_result->>'success')::boolean THEN
        -- Rollback contract creation if journal entry fails
        DELETE FROM public.contracts WHERE id = contract_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'JOURNAL_ENTRY_FAILED',
            'journal_error', journal_result,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Update contract status to active
    UPDATE public.contracts 
    SET status = 'active' 
    WHERE id = contract_id;
    
    -- Build success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'journal_entry_id', journal_result->>'journal_entry_id',
        'contract_data', contract_data,
        'journal_result', journal_result,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Clean up contract if it was created
    IF contract_id IS NOT NULL THEN
        DELETE FROM public.contracts WHERE id = contract_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM,
        'error_state', SQLSTATE,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
END;
$function$;

-- Improve process_pending_journal_entries function
CREATE OR REPLACE FUNCTION public.process_pending_journal_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    pending_entry RECORD;
    journal_result jsonb;
    processed_count integer := 0;
    failed_count integer := 0;
    results jsonb := '[]'::jsonb;
    start_time timestamp := clock_timestamp();
BEGIN
    -- Process failed journal entry creations from the last 24 hours
    FOR pending_entry IN 
        SELECT DISTINCT ccl.company_id, ccl.contract_id, ccl.metadata
        FROM public.contract_creation_log ccl
        WHERE ccl.operation_step = 'journal_entry_creation'
        AND ccl.status = 'failed'
        AND ccl.created_at > now() - INTERVAL '24 hours'
        AND ccl.contract_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.contracts c 
            WHERE c.id = ccl.contract_id 
            AND c.status = 'active'
            AND c.journal_entry_id IS NULL
        )
        ORDER BY ccl.created_at DESC
    LOOP
        BEGIN
            -- Attempt to create journal entry
            journal_result := public.create_contract_journal_entry(
                pending_entry.contract_id,
                NULL, -- Let function determine user
                NULL, -- Use default receivables account
                NULL, -- Use default revenue account
                false, -- Don't force recreate
                'Retry: Contract Journal Entry Processing'
            );
            
            IF (journal_result->>'success')::boolean THEN
                processed_count := processed_count + 1;
                
                -- Log success
                INSERT INTO public.contract_creation_log (
                    company_id,
                    contract_id,
                    operation_step,
                    status,
                    metadata
                ) VALUES (
                    pending_entry.company_id,
                    pending_entry.contract_id,
                    'journal_entry_retry',
                    'completed',
                    jsonb_build_object(
                        'retry_result', journal_result,
                        'processed_at', now()
                    )
                );
            ELSE
                failed_count := failed_count + 1;
                
                -- Log failure
                INSERT INTO public.contract_creation_log (
                    company_id,
                    contract_id,
                    operation_step,
                    status,
                    error_message,
                    metadata
                ) VALUES (
                    pending_entry.company_id,
                    pending_entry.contract_id,
                    'journal_entry_retry',
                    'failed',
                    journal_result->>'error_message',
                    jsonb_build_object(
                        'retry_result', journal_result,
                        'error_code', journal_result->>'error_code',
                        'processed_at', now()
                    )
                );
            END IF;
            
            -- Add to results
            results := results || jsonb_build_array(jsonb_build_object(
                'contract_id', pending_entry.contract_id,
                'company_id', pending_entry.company_id,
                'success', (journal_result->>'success')::boolean,
                'result', journal_result
            ));
            
        EXCEPTION WHEN OTHERS THEN
            failed_count := failed_count + 1;
            
            -- Log unexpected error
            INSERT INTO public.contract_creation_log (
                company_id,
                contract_id,
                operation_step,
                status,
                error_message,
                metadata
            ) VALUES (
                pending_entry.company_id,
                pending_entry.contract_id,
                'journal_entry_retry',
                'failed',
                'Unexpected error: ' || SQLERRM,
                jsonb_build_object(
                    'error_state', SQLSTATE,
                    'processed_at', now()
                )
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'processed_count', processed_count,
        'failed_count', failed_count,
        'total_attempts', processed_count + failed_count,
        'results', results,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
END;
$function$;