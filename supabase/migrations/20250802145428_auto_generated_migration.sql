-- Fix create_contract_safe function to use correct column names
CREATE OR REPLACE FUNCTION public.create_contract_safe(contract_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    contract_id uuid;
    company_id uuid;
    result jsonb := '{"success": false}'::jsonb;
    validation_result jsonb;
    journal_entry_id uuid;
    error_message text;
BEGIN
    -- Extract company_id for logging
    company_id := (contract_data->>'company_id')::uuid;
    
    -- Log contract creation start
    INSERT INTO public.contract_creation_log (
        company_id,
        operation_step,
        status,
        metadata
    ) VALUES (
        company_id,
        'contract_creation',
        'started',
        jsonb_build_object('contract_data', contract_data)
    );
    
    -- Validate contract data
    validation_result := public.validate_contract_data(contract_data);
    
    IF NOT (validation_result->>'valid')::boolean THEN
        -- Log validation failure
        INSERT INTO public.contract_creation_log (
            company_id,
            operation_step,
            status,
            error_message,
            metadata
        ) VALUES (
            company_id,
            'validation',
            'failed',
            'Contract validation failed',
            jsonb_build_object('validation_errors', validation_result->'errors')
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Validation failed',
            'validation', validation_result
        );
    END IF;
    
    -- Log validation success
    INSERT INTO public.contract_creation_log (
        company_id,
        operation_step,
        status,
        metadata
    ) VALUES (
        company_id,
        'validation',
        'completed',
        jsonb_build_object('message', 'Contract validation passed')
    );
    
    -- Create contract with correct column names
    INSERT INTO public.contracts (
        id,
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_type,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        terms,
        description,
        status,
        account_id,
        cost_center_id,
        created_by
    ) VALUES (
        gen_random_uuid(),
        (contract_data->>'company_id')::uuid,
        (contract_data->>'customer_id')::uuid,
        NULLIF(contract_data->>'vehicle_id', '')::uuid,
        contract_data->>'contract_number',
        contract_data->>'contract_type',
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        (contract_data->>'monthly_amount')::numeric,
        COALESCE(contract_data->>'terms_conditions', contract_data->>'terms'),
        COALESCE(contract_data->>'special_conditions', contract_data->>'description'),
        'draft',
        NULLIF(contract_data->>'account_id', '')::uuid,
        NULLIF(contract_data->>'cost_center_id', '')::uuid,
        auth.uid()
    ) RETURNING id INTO contract_id;
    
    -- Log contract creation success
    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,
        status,
        metadata
    ) VALUES (
        company_id,
        contract_id,
        'contract_creation',
        'completed',
        jsonb_build_object('contract_id', contract_id)
    );
    
    -- Create journal entry if account_id is provided
    IF contract_data->>'account_id' IS NOT NULL AND contract_data->>'account_id' != '' THEN
        BEGIN
            -- Log journal entry creation start
            INSERT INTO public.contract_creation_log (
                company_id,
                contract_id,
                operation_step,
                status,
                metadata
            ) VALUES (
                company_id,
                contract_id,
                'journal_entry_creation',
                'started',
                jsonb_build_object('account_id', contract_data->>'account_id')
            );
            
            -- Call the journal entry creation function
            SELECT public.create_contract_journal_entry(contract_id) INTO journal_entry_id;
            
            -- Log journal entry creation success
            INSERT INTO public.contract_creation_log (
                company_id,
                contract_id,
                operation_step,
                status,
                metadata
            ) VALUES (
                company_id,
                contract_id,
                'journal_entry_creation',
                'completed',
                jsonb_build_object('journal_entry_id', journal_entry_id)
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Log journal entry creation failure
            error_message := SQLERRM;
            
            INSERT INTO public.contract_creation_log (
                company_id,
                contract_id,
                operation_step,
                status,
                error_message,
                metadata
            ) VALUES (
                company_id,
                contract_id,
                'journal_entry_creation',
                'failed',
                error_message,
                jsonb_build_object('account_id', contract_data->>'account_id')
            );
            
            -- Don't fail the entire contract creation for journal entry issues
            RAISE NOTICE 'Journal entry creation failed: %', error_message;
        END;
    END IF;
    
    -- Update vehicle status if vehicle_id is provided
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' THEN
        UPDATE public.vehicles 
        SET status = 'rented', 
            updated_at = now()
        WHERE id = (contract_data->>'vehicle_id')::uuid;
        
        -- Log vehicle status update
        INSERT INTO public.contract_creation_log (
            company_id,
            contract_id,
            operation_step,
            status,
            metadata
        ) VALUES (
            company_id,
            contract_id,
            'vehicle_status_update',
            'completed',
            jsonb_build_object('vehicle_id', contract_data->>'vehicle_id', 'new_status', 'rented')
        );
    END IF;
    
    -- Log overall success
    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,
        status,
        metadata
    ) VALUES (
        company_id,
        contract_id,
        'contract_creation_complete',
        'completed',
        jsonb_build_object('contract_id', contract_id, 'journal_entry_id', journal_entry_id)
    );
    
    result := jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'journal_entry_id', journal_entry_id
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    
    -- Log overall failure
    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,
        status,
        error_message,
        metadata
    ) VALUES (
        company_id,
        COALESCE(contract_id, gen_random_uuid()),
        'contract_creation',
        'failed',
        error_message,
        jsonb_build_object('contract_data', contract_data)
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error', error_message
    );
END;
$function$;