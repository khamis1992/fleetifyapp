-- Phase 1: Fix Database Functions for Contract Creation

-- Drop existing functions to recreate them with proper signatures
DROP FUNCTION IF EXISTS public.create_contract_safe(jsonb);
DROP FUNCTION IF EXISTS public.validate_contract_realtime(jsonb);
DROP FUNCTION IF EXISTS public.check_vehicle_availability_realtime(uuid, date, date, uuid);
DROP FUNCTION IF EXISTS public.check_customer_eligibility_realtime(uuid);

-- Create unified contract creation function that handles both contract and journal entry
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    contract_data jsonb,
    user_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"success": false, "contract_id": null, "journal_entry_id": null, "errors": []}'::jsonb;
    new_contract_id uuid;
    journal_result jsonb;
    current_user_id uuid;
    company_id_val uuid;
    contract_number_val text;
    error_details text;
BEGIN
    -- Get current user and company
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Validate user exists and get company
    SELECT company_id INTO company_id_val
    FROM public.profiles 
    WHERE user_id = current_user_id;
    
    IF company_id_val IS NULL THEN
        RETURN jsonb_set(result, '{errors}', '["User not found or no company associated"]'::jsonb);
    END IF;
    
    -- Validate required fields
    IF NOT (contract_data ? 'customer_id') OR 
       NOT (contract_data ? 'contract_type') OR 
       NOT (contract_data ? 'start_date') OR 
       NOT (contract_data ? 'end_date') OR 
       NOT (contract_data ? 'contract_amount') THEN
        RETURN jsonb_set(result, '{errors}', '["Missing required fields: customer_id, contract_type, start_date, end_date, contract_amount"]'::jsonb);
    END IF;
    
    -- Validate customer exists and is active
    IF NOT EXISTS(
        SELECT 1 FROM public.customers 
        WHERE id = (contract_data->>'customer_id')::uuid 
        AND company_id = company_id_val 
        AND is_active = true 
        AND is_blacklisted = false
    ) THEN
        RETURN jsonb_set(result, '{errors}', '["Customer not found, inactive, or blacklisted"]'::jsonb);
    END IF;
    
    -- Validate vehicle availability if vehicle_id is provided
    IF contract_data ? 'vehicle_id' AND (contract_data->>'vehicle_id') IS NOT NULL AND (contract_data->>'vehicle_id') != '' THEN
        IF EXISTS(
            SELECT 1 FROM public.contracts 
            WHERE vehicle_id = (contract_data->>'vehicle_id')::uuid
            AND status IN ('active', 'draft')
            AND (start_date, end_date) OVERLAPS ((contract_data->>'start_date')::date, (contract_data->>'end_date')::date)
            AND company_id = company_id_val
        ) THEN
            RETURN jsonb_set(result, '{errors}', '["Vehicle is not available for the selected period"]'::jsonb);
        END IF;
    END IF;
    
    -- Generate contract number
    SELECT 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
           LPAD((COUNT(*) + 1)::TEXT, 4, '0')
    INTO contract_number_val
    FROM public.contracts 
    WHERE company_id = company_id_val 
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Create the contract
    INSERT INTO public.contracts (
        id,
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
        description,
        terms,
        status,
        created_by,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        company_id_val,
        (contract_data->>'customer_id')::uuid,
        CASE 
            WHEN contract_data ? 'vehicle_id' AND (contract_data->>'vehicle_id') IS NOT NULL AND (contract_data->>'vehicle_id') != '' 
            THEN (contract_data->>'vehicle_id')::uuid 
            ELSE NULL 
        END,
        contract_number_val,
        contract_data->>'contract_type',
        COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
        (contract_data->>'start_date')::date,
        (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric,
        COALESCE((contract_data->>'monthly_amount')::numeric, (contract_data->>'contract_amount')::numeric),
        contract_data->>'description',
        contract_data->>'terms',
        COALESCE(contract_data->>'status', 'draft'),
        current_user_id,
        CASE 
            WHEN contract_data ? 'cost_center_id' AND (contract_data->>'cost_center_id') IS NOT NULL 
            THEN (contract_data->>'cost_center_id')::uuid 
            ELSE public.get_customer_default_cost_center((contract_data->>'customer_id')::uuid)
        END
    ) RETURNING id INTO new_contract_id;
    
    -- Update result with contract info
    result := jsonb_set(result, '{success}', 'true'::jsonb);
    result := jsonb_set(result, '{contract_id}', to_jsonb(new_contract_id));
    result := jsonb_set(result, '{contract_number}', to_jsonb(contract_number_val));
    
    -- Create journal entry if contract amount > 0
    IF (contract_data->>'contract_amount')::numeric > 0 THEN
        SELECT public.create_contract_journal_entry_enhanced(
            new_contract_id,
            current_user_id,
            'contract_creation',
            (contract_data->>'contract_amount')::numeric
        ) INTO journal_result;
        
        IF (journal_result->>'success')::boolean THEN
            result := jsonb_set(result, '{journal_entry_id}', journal_result->'journal_entry_id');
            result := jsonb_set(result, '{journal_entry_number}', journal_result->'journal_entry_number');
        ELSE
            -- Journal entry failed, but contract was created - log the issue
            result := jsonb_set(result, '{warnings}', jsonb_build_array('Contract created but journal entry failed: ' || (journal_result->>'error_message')));
        END IF;
    END IF;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_details = PG_EXCEPTION_DETAIL;
    RETURN jsonb_build_object(
        'success', false,
        'errors', jsonb_build_array('Database error: ' || SQLERRM),
        'error_code', SQLSTATE,
        'error_details', error_details
    );
END;
$$;

-- Create improved validation functions
CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    validation_result jsonb := '{"valid": true, "errors": [], "warnings": []}'::jsonb;
    company_id_val uuid;
    customer_status record;
    vehicle_conflicts integer;
    essential_mappings jsonb;
BEGIN
    -- Get user company
    SELECT company_id INTO company_id_val
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF company_id_val IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'errors', jsonb_build_array('User company not found'));
    END IF;
    
    -- Validate customer
    IF contract_data ? 'customer_id' AND (contract_data->>'customer_id') IS NOT NULL THEN
        SELECT is_active, is_blacklisted, 
               CASE WHEN customer_type = 'individual' 
                    THEN first_name || ' ' || last_name 
                    ELSE company_name 
               END as name
        INTO customer_status
        FROM public.customers
        WHERE id = (contract_data->>'customer_id')::uuid 
        AND company_id = company_id_val;
        
        IF NOT FOUND THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
            validation_result := jsonb_set(validation_result, '{errors}', 
                (validation_result->'errors') || '["Customer not found"]'::jsonb);
        ELSIF customer_status.is_blacklisted THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
            validation_result := jsonb_set(validation_result, '{errors}', 
                (validation_result->'errors') || jsonb_build_array('Customer "' || customer_status.name || '" is blacklisted'));
        ELSIF NOT customer_status.is_active THEN
            validation_result := jsonb_set(validation_result, '{warnings}', 
                (validation_result->'warnings') || jsonb_build_array('Customer "' || customer_status.name || '" is inactive'));
        END IF;
    END IF;
    
    -- Validate vehicle availability
    IF contract_data ? 'vehicle_id' AND 
       (contract_data->>'vehicle_id') IS NOT NULL AND 
       (contract_data->>'vehicle_id') != '' AND
       contract_data ? 'start_date' AND 
       contract_data ? 'end_date' THEN
        
        SELECT COUNT(*) INTO vehicle_conflicts
        FROM public.contracts 
        WHERE vehicle_id = (contract_data->>'vehicle_id')::uuid
        AND status IN ('active', 'draft')
        AND company_id = company_id_val
        AND (start_date, end_date) OVERLAPS ((contract_data->>'start_date')::date, (contract_data->>'end_date')::date);
        
        IF vehicle_conflicts > 0 THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
            validation_result := jsonb_set(validation_result, '{errors}', 
                (validation_result->'errors') || '["Vehicle has conflicting bookings for the selected period"]'::jsonb);
        END IF;
    END IF;
    
    -- Check essential account mappings
    SELECT public.ensure_essential_account_mappings(company_id_val) INTO essential_mappings;
    
    IF jsonb_array_length(essential_mappings->'errors') > 0 THEN
        validation_result := jsonb_set(validation_result, '{warnings}', 
            (validation_result->'warnings') || jsonb_build_array('Some account mappings are missing - journal entries may fail'));
    END IF;
    
    RETURN validation_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'valid', false,
        'errors', jsonb_build_array('Validation error: ' || SQLERRM)
    );
END;
$$;

-- Create specific validation functions for real-time checks
CREATE OR REPLACE FUNCTION public.check_vehicle_availability_realtime(
    vehicle_id_param uuid,
    start_date_param date,
    end_date_param date,
    exclude_contract_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    conflict_count integer;
    company_id_val uuid;
    vehicle_status text;
BEGIN
    -- Get user company
    SELECT company_id INTO company_id_val
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    -- Check vehicle status
    SELECT status INTO vehicle_status
    FROM public.vehicles
    WHERE id = vehicle_id_param AND company_id = company_id_val;
    
    IF vehicle_status IS NULL THEN
        RETURN jsonb_build_object('available', false, 'reason', 'Vehicle not found');
    END IF;
    
    IF vehicle_status NOT IN ('available', 'reserved') THEN
        RETURN jsonb_build_object('available', false, 'reason', 'Vehicle is ' || vehicle_status);
    END IF;
    
    -- Check for conflicts
    SELECT COUNT(*) INTO conflict_count
    FROM public.contracts 
    WHERE vehicle_id = vehicle_id_param
    AND status IN ('active', 'draft')
    AND company_id = company_id_val
    AND (start_date, end_date) OVERLAPS (start_date_param, end_date_param)
    AND (exclude_contract_id_param IS NULL OR id != exclude_contract_id_param);
    
    IF conflict_count > 0 THEN
        RETURN jsonb_build_object('available', false, 'reason', 'Vehicle has conflicting bookings');
    END IF;
    
    RETURN jsonb_build_object('available', true, 'reason', 'Vehicle is available');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Error checking availability: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_customer_eligibility_realtime(customer_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_record record;
    company_id_val uuid;
BEGIN
    -- Get user company
    SELECT company_id INTO company_id_val
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    -- Get customer details
    SELECT is_active, is_blacklisted, blacklist_reason,
           CASE WHEN customer_type = 'individual' 
                THEN first_name || ' ' || last_name 
                ELSE company_name 
           END as name
    INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param AND company_id = company_id_val;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Customer not found');
    END IF;
    
    IF customer_record.is_blacklisted THEN
        RETURN jsonb_build_object(
            'eligible', false, 
            'reason', 'Customer is blacklisted: ' || COALESCE(customer_record.blacklist_reason, 'No reason provided')
        );
    END IF;
    
    IF NOT customer_record.is_active THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'Customer is inactive');
    END IF;
    
    RETURN jsonb_build_object('eligible', true, 'reason', 'Customer is eligible');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Error checking eligibility: ' || SQLERRM);
END;
$$;

-- Create updated contract creation function with better error handling
CREATE OR REPLACE FUNCTION public.create_contract_safe(
    customer_id_param uuid,
    vehicle_id_param uuid DEFAULT NULL,
    contract_type_param text DEFAULT 'rental',
    contract_date_param date DEFAULT CURRENT_DATE,
    start_date_param date DEFAULT CURRENT_DATE,
    end_date_param date DEFAULT NULL,
    contract_amount_param numeric DEFAULT 0,
    monthly_amount_param numeric DEFAULT NULL,
    description_param text DEFAULT NULL,
    terms_param text DEFAULT NULL,
    status_param text DEFAULT 'draft',
    cost_center_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_data jsonb;
BEGIN
    -- Build contract data from parameters
    contract_data := jsonb_build_object(
        'customer_id', customer_id_param,
        'vehicle_id', vehicle_id_param,
        'contract_type', contract_type_param,
        'contract_date', contract_date_param,
        'start_date', start_date_param,
        'end_date', end_date_param,
        'contract_amount', contract_amount_param,
        'monthly_amount', COALESCE(monthly_amount_param, contract_amount_param),
        'description', description_param,
        'terms', terms_param,
        'status', status_param,
        'cost_center_id', cost_center_id_param
    );
    
    -- Use the unified creation function
    RETURN public.create_contract_with_journal_entry(contract_data);
END;
$$;