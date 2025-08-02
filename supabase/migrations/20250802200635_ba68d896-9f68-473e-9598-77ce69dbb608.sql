-- Create wrapper function for create_contract_journal_entry to maintain backward compatibility
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    journal_entry_id uuid;
BEGIN
    -- Call the enhanced function
    result := public.create_contract_journal_entry_enhanced(
        contract_id_param := contract_id_param,
        user_id_param := auth.uid(),
        entry_type_param := 'contract_creation',
        amount_param := NULL
    );
    
    -- Check if successful and extract journal entry ID
    IF (result->>'success')::boolean = true THEN
        journal_entry_id := (result->>'journal_entry_id')::uuid;
        RETURN journal_entry_id;
    ELSE
        -- Log the error and raise exception
        RAISE EXCEPTION 'Failed to create contract journal entry: %', 
            COALESCE(result->>'error_message', 'Unknown error');
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating contract journal entry: %', SQLERRM;
END;
$function$;

-- Update create_contract_safe function to better handle journal entry creation
CREATE OR REPLACE FUNCTION public.create_contract_safe(
    company_id_param uuid,
    customer_id_param uuid,
    contract_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_id uuid;
    journal_entry_id uuid;
    contract_number text;
    validation_result jsonb;
    log_id uuid;
    error_context text;
BEGIN
    -- Log the start of contract creation
    log_id := public.log_contract_creation_step(
        company_id_param, 
        NULL, 
        'contract_creation_started', 
        'processing',
        NULL,
        jsonb_build_object('input_data', contract_data)
    );
    
    -- Validate contract data
    validation_result := public.validate_contract_data(contract_data);
    
    IF NOT (validation_result->>'valid')::boolean THEN
        PERFORM public.log_contract_creation_step(
            company_id_param, 
            NULL, 
            'validation', 
            'failed',
            'Contract validation failed: ' || (validation_result->>'errors')::text,
            validation_result
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'VALIDATION_FAILED',
            'error_message', 'Contract validation failed',
            'validation_errors', validation_result->'errors'
        );
    END IF;
    
    -- Log successful validation
    PERFORM public.log_contract_creation_step(
        company_id_param, 
        NULL, 
        'validation', 
        'completed',
        NULL,
        jsonb_build_object('validation_result', validation_result)
    );
    
    BEGIN
        -- Generate contract number
        contract_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
            LPAD((
                SELECT COUNT(*) + 1 
                FROM public.contracts 
                WHERE company_id = company_id_param 
                AND EXTRACT(MONTH FROM contract_date) = EXTRACT(MONTH FROM CURRENT_DATE)
            )::TEXT, 4, '0');
        
        -- Create the contract
        INSERT INTO public.contracts (
            id,
            company_id,
            customer_id,
            contract_number,
            contract_date,
            start_date,
            end_date,
            contract_type,
            contract_amount,
            monthly_amount,
            vehicle_id,
            description,
            terms,
            status,
            created_by,
            cost_center_id
        ) VALUES (
            gen_random_uuid(),
            company_id_param,
            customer_id_param,
            contract_number,
            COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
            (contract_data->>'start_date')::date,
            (contract_data->>'end_date')::date,
            COALESCE(contract_data->>'contract_type', 'rental'),
            (contract_data->>'contract_amount')::numeric,
            (contract_data->>'monthly_amount')::numeric,
            CASE 
                WHEN contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none'
                THEN (contract_data->>'vehicle_id')::uuid
                ELSE NULL
            END,
            contract_data->>'description',
            contract_data->>'terms',
            'draft',
            auth.uid(),
            CASE 
                WHEN contract_data->>'cost_center_id' IS NOT NULL AND contract_data->>'cost_center_id' != ''
                THEN (contract_data->>'cost_center_id')::uuid
                ELSE public.get_customer_default_cost_center(customer_id_param)
            END
        ) RETURNING id INTO contract_id;
        
        -- Log successful contract creation
        PERFORM public.log_contract_creation_step(
            company_id_param, 
            contract_id, 
            'contract_creation', 
            'completed',
            NULL,
            jsonb_build_object('contract_id', contract_id, 'contract_number', contract_number)
        );
        
    EXCEPTION WHEN OTHERS THEN
        error_context := 'Failed to create contract: ' || SQLERRM;
        PERFORM public.log_contract_creation_step(
            company_id_param, 
            NULL, 
            'contract_creation', 
            'failed',
            error_context,
            jsonb_build_object('sql_error', SQLERRM, 'sql_state', SQLSTATE)
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_CREATION_FAILED',
            'error_message', 'Failed to create contract',
            'details', error_context
        );
    END;
    
    -- Create journal entry
    BEGIN
        journal_entry_id := public.create_contract_journal_entry(contract_id);
        
        -- Update contract with journal entry ID
        UPDATE public.contracts 
        SET journal_entry_id = journal_entry_id
        WHERE id = contract_id;
        
        -- Log successful journal entry creation
        PERFORM public.log_contract_creation_step(
            company_id_param, 
            contract_id, 
            'journal_entry_creation', 
            'completed',
            NULL,
            jsonb_build_object('journal_entry_id', journal_entry_id)
        );
        
    EXCEPTION WHEN OTHERS THEN
        error_context := 'Failed to create journal entry: ' || SQLERRM;
        PERFORM public.log_contract_creation_step(
            company_id_param, 
            contract_id, 
            'journal_entry_creation', 
            'failed',
            error_context,
            jsonb_build_object('sql_error', SQLERRM, 'sql_state', SQLSTATE)
        );
        
        -- Don't fail the entire process for journal entry creation failure
        -- Log the issue but continue with contract creation
        journal_entry_id := NULL;
    END;
    
    -- Update vehicle status if vehicle is assigned
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        BEGIN
            UPDATE public.vehicles 
            SET status = 'reserved'
            WHERE id = (contract_data->>'vehicle_id')::uuid;
            
            PERFORM public.log_contract_creation_step(
                company_id_param, 
                contract_id, 
                'vehicle_status_update', 
                'completed',
                NULL,
                jsonb_build_object('vehicle_id', contract_data->>'vehicle_id', 'new_status', 'reserved')
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_context := 'Failed to update vehicle status: ' || SQLERRM;
            PERFORM public.log_contract_creation_step(
                company_id_param, 
                contract_id, 
                'vehicle_status_update', 
                'failed',
                error_context,
                jsonb_build_object('sql_error', SQLERRM, 'sql_state', SQLSTATE)
            );
        END;
    END IF;
    
    -- Log final completion
    PERFORM public.log_contract_creation_step(
        company_id_param, 
        contract_id, 
        'contract_creation_completed', 
        'completed',
        NULL,
        jsonb_build_object(
            'contract_id', contract_id, 
            'contract_number', contract_number,
            'journal_entry_id', journal_entry_id,
            'has_journal_entry', journal_entry_id IS NOT NULL
        )
    );
    
    -- Return success result
    RETURN jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'contract_number', contract_number,
        'journal_entry_id', journal_entry_id,
        'status', 'Contract created successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    error_context := 'Unexpected error in contract creation: ' || SQLERRM;
    PERFORM public.log_contract_creation_step(
        company_id_param, 
        contract_id, 
        'contract_creation_error', 
        'failed',
        error_context,
        jsonb_build_object('sql_error', SQLERRM, 'sql_state', SQLSTATE)
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', 'An unexpected error occurred during contract creation',
        'details', error_context
    );
END;
$function$;