-- Update create_contract_safe function to integrate journal entry creation directly
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
    contract_number text;
    journal_entry_id uuid;
    result jsonb := '{"success": true}'::jsonb;
    current_user_id uuid;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Generate contract number
    contract_number := 'CON-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.contracts 
        WHERE company_id = company_id_param 
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Log contract creation start
    PERFORM public.log_contract_creation_step(
        company_id_param,
        NULL,
        'contract_creation_start',
        'in_progress',
        NULL,
        jsonb_build_object(
            'contract_number', contract_number,
            'customer_id', customer_id_param
        )
    );
    
    -- Create the contract
    INSERT INTO public.contracts (
        id,
        company_id,
        customer_id,
        contract_number,
        contract_type,
        vehicle_id,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        payment_frequency,
        status,
        notes,
        created_by,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        customer_id_param,
        contract_number,
        (contract_data->>'contract_type')::text,
        CASE 
            WHEN contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none'
            THEN (contract_data->>'vehicle_id')::uuid
            ELSE NULL
        END,
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        (contract_data->>'monthly_amount')::numeric,
        COALESCE((contract_data->>'payment_frequency')::text, 'monthly'),
        'draft',
        contract_data->>'notes',
        current_user_id,
        CASE 
            WHEN contract_data->>'cost_center_id' IS NOT NULL AND contract_data->>'cost_center_id' != ''
            THEN (contract_data->>'cost_center_id')::uuid
            ELSE public.get_customer_default_cost_center(customer_id_param)
        END
    ) RETURNING id INTO contract_id;
    
    -- Log contract creation success
    PERFORM public.log_contract_creation_step(
        company_id_param,
        contract_id,
        'contract_creation',
        'completed',
        NULL,
        jsonb_build_object(
            'contract_id', contract_id,
            'contract_number', contract_number
        )
    );
    
    -- Update vehicle status if vehicle is assigned
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        UPDATE public.vehicles 
        SET status = 'rented' 
        WHERE id = (contract_data->>'vehicle_id')::uuid 
        AND company_id = company_id_param;
        
        PERFORM public.log_contract_creation_step(
            company_id_param,
            contract_id,
            'vehicle_status_update',
            'completed',
            NULL,
            jsonb_build_object(
                'vehicle_id', contract_data->>'vehicle_id',
                'new_status', 'rented'
            )
        );
    END IF;
    
    -- Activate the contract
    UPDATE public.contracts 
    SET status = 'active' 
    WHERE id = contract_id;
    
    PERFORM public.log_contract_creation_step(
        company_id_param,
        contract_id,
        'contract_activation',
        'completed',
        NULL,
        jsonb_build_object(
            'contract_id', contract_id,
            'status', 'active'
        )
    );
    
    -- Create journal entry directly (no background job needed for new contracts)
    BEGIN
        SELECT public.create_contract_journal_entry(
            contract_id,
            company_id_param,
            current_user_id
        ) INTO journal_entry_id;
        
        PERFORM public.log_contract_creation_step(
            company_id_param,
            contract_id,
            'journal_entry_creation',
            'completed',
            NULL,
            jsonb_build_object(
                'journal_entry_id', journal_entry_id
            )
        );
        
        result := result || jsonb_build_object('journal_entry_created', true, 'journal_entry_id', journal_entry_id);
        
    EXCEPTION WHEN OTHERS THEN
        -- Log journal entry failure but don't fail the entire contract creation
        PERFORM public.log_contract_creation_step(
            company_id_param,
            contract_id,
            'journal_entry_creation',
            'failed',
            SQLERRM,
            jsonb_build_object(
                'error_code', SQLSTATE,
                'will_retry_background', true
            )
        );
        
        result := result || jsonb_build_object('journal_entry_created', false, 'will_retry_background', true);
    END;
    
    -- Build success response
    result := result || jsonb_build_object(
        'contract_id', contract_id,
        'contract_number', contract_number,
        'status', 'active'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the general failure
        PERFORM public.log_contract_creation_step(
            company_id_param,
            contract_id,
            'contract_creation',
            'failed',
            SQLERRM,
            jsonb_build_object(
                'error_code', SQLSTATE,
                'contract_number', contract_number
            )
        );
        
        -- Return error response
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'contract_id', contract_id,
            'contract_number', contract_number
        );
END;
$function$;