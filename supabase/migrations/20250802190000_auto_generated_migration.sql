-- Drop all existing versions of create_contract_safe function
DROP FUNCTION IF EXISTS public.create_contract_safe(jsonb);
DROP FUNCTION IF EXISTS public.create_contract_safe(jsonb, uuid);

-- Create unified and improved create_contract_safe function
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
    contract_number_generated text;
    user_company_id uuid;
BEGIN
    -- Get current user ID
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Log start of operation
    PERFORM log_contract_creation_step(
        (contract_data->>'company_id')::uuid,
        NULL,
        'contract_creation_start',
        'started',
        NULL,
        jsonb_build_object(
            'user_id', current_user_id,
            'contract_type', contract_data->>'contract_type',
            'start_time', start_time
        )
    );
    
    -- Get user's company ID for validation
    SELECT company_id INTO user_company_id
    FROM public.profiles 
    WHERE user_id = current_user_id 
    LIMIT 1;
    
    IF user_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'USER_COMPANY_NOT_FOUND',
            'error_message', 'User company not found',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Validate that contract belongs to user's company
    IF (contract_data->>'company_id')::uuid != user_company_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'COMPANY_MISMATCH',
            'error_message', 'Contract company does not match user company',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Validate contract data
    validation_result := public.validate_contract_data(contract_data);
    
    IF NOT (validation_result->>'valid')::boolean THEN
        -- Log validation failure
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            NULL,
            'contract_validation',
            'failed',
            'Contract validation failed',
            jsonb_build_object(
                'validation_errors', validation_result->'errors'
            )
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'VALIDATION_FAILED',
            'validation_errors', validation_result->'errors',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Log successful validation
    PERFORM log_contract_creation_step(
        (contract_data->>'company_id')::uuid,
        NULL,
        'contract_validation',
        'completed',
        NULL,
        jsonb_build_object('validation_result', validation_result)
    );
    
    -- Generate contract number if not provided
    IF contract_data->>'contract_number' IS NULL OR contract_data->>'contract_number' = '' THEN
        contract_number_generated := 'CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.contracts 
            WHERE company_id = (contract_data->>'company_id')::uuid 
            AND EXTRACT(YEAR FROM contract_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 4, '0');
        
        contract_data := jsonb_set(contract_data, '{contract_number}', to_jsonb(contract_number_generated));
    END IF;
    
    -- Create the contract
    BEGIN
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
            created_by,
            cost_center_id
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
            current_user_id,
            NULLIF(contract_data->>'cost_center_id', '')::uuid
        ) RETURNING id INTO contract_id;
        
        -- Log successful contract creation
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            contract_id,
            'contract_creation',
            'completed',
            NULL,
            jsonb_build_object(
                'contract_id', contract_id,
                'contract_number', contract_data->>'contract_number'
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log contract creation failure
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            NULL,
            'contract_creation',
            'failed',
            'Contract insertion failed: ' || SQLERRM,
            jsonb_build_object(
                'error_state', SQLSTATE,
                'error_detail', SQLERRM
            )
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_CREATION_FAILED',
            'error_message', 'Failed to create contract: ' || SQLERRM,
            'error_state', SQLSTATE,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END;
    
    -- Create journal entry
    journal_result := public.create_contract_journal_entry(
        contract_id,
        current_user_id
    );
    
    IF NOT (journal_result->>'success')::boolean THEN
        -- Journal entry failed, but don't rollback contract - log the issue
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            contract_id,
            'journal_entry_creation',
            'failed',
            journal_result->>'error_message',
            jsonb_build_object(
                'journal_error_code', journal_result->>'error_code',
                'journal_result', journal_result
            )
        );
        
        -- Update contract status to active anyway (journal entry can be created later)
        UPDATE public.contracts 
        SET status = 'active' 
        WHERE id = contract_id;
        
        -- Return success with journal warning
        RETURN jsonb_build_object(
            'success', true,
            'contract_id', contract_id,
            'contract_number', contract_data->>'contract_number',
            'status', 'active',
            'journal_entry_warning', true,
            'journal_error', journal_result,
            'contract_data', contract_data,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    ELSE
        -- Log successful journal entry creation
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            contract_id,
            'journal_entry_creation',
            'completed',
            NULL,
            jsonb_build_object(
                'journal_entry_id', journal_result->>'journal_entry_id',
                'journal_entry_number', journal_result->>'journal_entry_number'
            )
        );
    END IF;
    
    -- Update contract status to active
    UPDATE public.contracts 
    SET status = 'active' 
    WHERE id = contract_id;
    
    -- Log completion
    PERFORM log_contract_creation_step(
        (contract_data->>'company_id')::uuid,
        contract_id,
        'contract_creation_complete',
        'completed',
        NULL,
        jsonb_build_object(
            'total_execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        )
    );
    
    -- Build success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'contract_number', contract_data->>'contract_number',
        'status', 'active',
        'journal_entry_id', journal_result->>'journal_entry_id',
        'journal_entry_number', journal_result->>'journal_entry_number',
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
    
    -- Log unexpected error
    PERFORM log_contract_creation_step(
        COALESCE((contract_data->>'company_id')::uuid, user_company_id),
        contract_id,
        'contract_creation_error',
        'failed',
        'Unexpected error: ' || SQLERRM,
        jsonb_build_object(
            'error_state', SQLSTATE,
            'error_detail', SQLERRM,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        )
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM,
        'error_state', SQLSTATE,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
END;
$function$;