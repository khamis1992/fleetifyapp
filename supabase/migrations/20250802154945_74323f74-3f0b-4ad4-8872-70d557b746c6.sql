-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_contract_safe(jsonb);

-- Create the corrected create_contract_safe function
CREATE OR REPLACE FUNCTION public.create_contract_safe(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb := '{"success": false, "contract_id": null, "error": null}'::jsonb;
    contract_id uuid;
    company_id_param uuid;
    current_user_id uuid;
    contract_number_val text;
BEGIN
    -- Get current user and company
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        result := jsonb_set(result, '{error}', '"Authentication required"');
        RETURN result;
    END IF;
    
    -- Get company ID
    SELECT p.company_id INTO company_id_param
    FROM public.profiles p
    WHERE p.user_id = current_user_id;
    
    IF company_id_param IS NULL THEN
        result := jsonb_set(result, '{error}', '"User company not found"');
        RETURN result;
    END IF;
    
    -- Generate contract number if not provided
    contract_number_val := contract_data->>'contract_number';
    IF contract_number_val IS NULL OR contract_number_val = '' THEN
        contract_number_val := 'CTR-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.contracts 
            WHERE company_id = company_id_param 
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 4, '0');
    END IF;
    
    -- Create the contract with only existing columns
    INSERT INTO public.contracts (
        id,
        company_id,
        contract_number,
        customer_id,
        vehicle_id,
        contract_type,
        contract_amount,
        monthly_amount,
        start_date,
        end_date,
        contract_date,
        status,
        terms,
        description,
        cost_center_id,
        account_id,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        contract_number_val,
        (contract_data->>'customer_id')::uuid,
        CASE 
            WHEN contract_data->>'vehicle_id' = 'none' OR contract_data->>'vehicle_id' = '' 
            THEN NULL 
            ELSE (contract_data->>'vehicle_id')::uuid 
        END,
        COALESCE(contract_data->>'contract_type', 'daily'),
        COALESCE((contract_data->>'contract_amount')::numeric, 0),
        COALESCE((contract_data->>'monthly_amount')::numeric, 0),
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
        COALESCE(contract_data->>'status', 'draft'),
        contract_data->>'terms',
        contract_data->>'description',
        (contract_data->>'cost_center_id')::uuid,
        (contract_data->>'account_id')::uuid,
        current_user_id,
        now(),
        now()
    ) RETURNING id INTO contract_id;
    
    -- Update result with success
    result := jsonb_set(result, '{success}', 'true'::jsonb);
    result := jsonb_set(result, '{contract_id}', to_jsonb(contract_id));
    
    -- Log successful creation
    PERFORM public.log_contract_creation_step(
        company_id_param,
        contract_id,
        'contract_creation',
        'completed',
        NULL,
        jsonb_build_object('contract_number', contract_number_val)
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        PERFORM public.log_contract_creation_step(
            company_id_param,
            NULL,
            'contract_creation',
            'failed',
            SQLERRM,
            contract_data
        );
        
        result := jsonb_set(result, '{error}', to_jsonb(SQLERRM));
        RETURN result;
END;
$function$;