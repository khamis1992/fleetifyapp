-- Fix create_contract_safe function to use correct column names
CREATE OR REPLACE FUNCTION public.create_contract_safe(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_contract_id uuid;
    contract_number text;
    customer_record RECORD;
    vehicle_record RECORD;
    result jsonb := '{"success": false, "contract_id": null, "error": null}'::jsonb;
    company_id_param uuid;
    created_by_user_id uuid;
BEGIN
    -- Get user and company information
    created_by_user_id := auth.uid();
    
    IF created_by_user_id IS NULL THEN
        result := jsonb_set(result, '{error}', '"User not authenticated"');
        RETURN result;
    END IF;
    
    -- Get company_id from user profile
    SELECT company_id INTO company_id_param
    FROM public.profiles
    WHERE user_id = created_by_user_id;
    
    IF company_id_param IS NULL THEN
        result := jsonb_set(result, '{error}', '"User company not found"');
        RETURN result;
    END IF;
    
    -- Log contract creation start
    PERFORM public.log_contract_creation_step(
        company_id_param, 
        null, 
        'contract_creation', 
        'started', 
        null, 
        contract_data
    );
    
    -- Validate required fields
    IF contract_data->>'customer_id' IS NULL THEN
        result := jsonb_set(result, '{error}', '"Customer ID is required"');
        RETURN result;
    END IF;
    
    -- Get customer information
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = (contract_data->>'customer_id')::uuid
    AND company_id = company_id_param;
    
    IF NOT FOUND THEN
        result := jsonb_set(result, '{error}', '"Customer not found"');
        RETURN result;
    END IF;
    
    -- Check if customer is blacklisted
    IF customer_record.is_blacklisted = true THEN
        result := jsonb_set(result, '{error}', '"Customer is blacklisted"');
        RETURN result;
    END IF;
    
    -- Validate vehicle if provided
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        SELECT * INTO vehicle_record
        FROM public.vehicles
        WHERE id = (contract_data->>'vehicle_id')::uuid
        AND company_id = company_id_param;
        
        IF NOT FOUND THEN
            result := jsonb_set(result, '{error}', '"Vehicle not found"');
            RETURN result;
        END IF;
        
        IF vehicle_record.status NOT IN ('available', 'reserved') THEN
            result := jsonb_set(result, '{error}', '"Vehicle is not available"');
            RETURN result;
        END IF;
    END IF;
    
    -- Generate contract number
    contract_number := 'CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.contracts 
        WHERE company_id = company_id_param 
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Generate new contract ID
    new_contract_id := gen_random_uuid();
    
    -- Insert the contract with correct column names
    INSERT INTO public.contracts (
        id,
        company_id,
        contract_number,
        customer_id,
        vehicle_id,
        contract_type,
        start_date,
        end_date,
        rental_days,
        daily_rate,
        weekly_rate,
        monthly_rate,
        contract_amount,
        monthly_amount,
        security_deposit,
        insurance_amount,
        terms,  -- Use 'terms' not 'terms_conditions'
        notes,
        status,
        cost_center_id,
        account_id,
        created_by
    ) VALUES (
        new_contract_id,
        company_id_param,
        contract_number,
        (contract_data->>'customer_id')::uuid,
        CASE 
            WHEN contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' 
            THEN (contract_data->>'vehicle_id')::uuid 
            ELSE NULL 
        END,
        COALESCE(contract_data->>'contract_type', 'rental'),
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        COALESCE((contract_data->>'rental_days')::integer, 30),
        COALESCE((contract_data->>'daily_rate')::numeric, 0),
        COALESCE((contract_data->>'weekly_rate')::numeric, 0),
        COALESCE((contract_data->>'monthly_rate')::numeric, 0),
        COALESCE((contract_data->>'contract_amount')::numeric, 0),
        COALESCE((contract_data->>'monthly_amount')::numeric, 0),
        COALESCE((contract_data->>'security_deposit')::numeric, 0),
        COALESCE((contract_data->>'insurance_amount')::numeric, 0),
        contract_data->>'terms',  -- Use 'terms' column
        contract_data->>'notes',
        'draft',
        CASE 
            WHEN contract_data->>'cost_center_id' IS NOT NULL AND contract_data->>'cost_center_id' != '' 
            THEN (contract_data->>'cost_center_id')::uuid 
            ELSE NULL 
        END,
        CASE 
            WHEN contract_data->>'account_id' IS NOT NULL AND contract_data->>'account_id' != '' 
            THEN (contract_data->>'account_id')::uuid 
            ELSE NULL 
        END,
        created_by_user_id
    );
    
    -- Update vehicle status if vehicle is assigned
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        UPDATE public.vehicles 
        SET status = 'rented', updated_at = now()
        WHERE id = (contract_data->>'vehicle_id')::uuid;
    END IF;
    
    -- Log successful contract creation
    PERFORM public.log_contract_creation_step(
        company_id_param, 
        new_contract_id, 
        'contract_creation', 
        'completed', 
        null, 
        jsonb_build_object('contract_number', contract_number)
    );
    
    -- Create journal entry
    BEGIN
        PERFORM public.create_contract_journal_entry(new_contract_id, company_id_param, created_by_user_id);
        
        -- Log successful journal entry creation
        PERFORM public.log_contract_creation_step(
            company_id_param, 
            new_contract_id, 
            'journal_entry_creation', 
            'completed', 
            null, 
            jsonb_build_object('journal_created', true)
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log journal entry failure but don't fail the entire contract creation
            PERFORM public.log_contract_creation_step(
                company_id_param, 
                new_contract_id, 
                'journal_entry_creation', 
                'failed', 
                SQLERRM, 
                jsonb_build_object('error_details', SQLERRM)
            );
    END;
    
    -- Return success result
    result := jsonb_set(result, '{success}', 'true'::jsonb);
    result := jsonb_set(result, '{contract_id}', to_jsonb(new_contract_id));
    result := jsonb_set(result, '{contract_number}', to_jsonb(contract_number));
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        PERFORM public.log_contract_creation_step(
            COALESCE(company_id_param, (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())), 
            new_contract_id, 
            'contract_creation', 
            'failed', 
            SQLERRM, 
            jsonb_build_object('error_details', SQLERRM)
        );
        
        result := jsonb_set(result, '{error}', to_jsonb('Contract creation failed: ' || SQLERRM));
        RETURN result;
END;
$function$;