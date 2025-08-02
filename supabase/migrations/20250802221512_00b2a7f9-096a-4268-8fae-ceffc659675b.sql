-- Drop all existing versions of the conflicting function
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry CASCADE;

-- Drop any other potentially conflicting contract functions
DROP FUNCTION IF EXISTS public.create_contract CASCADE;
DROP FUNCTION IF EXISTS public.validate_contract_data CASCADE;

-- Create the unified contract creation function
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_number text DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
    p_contract_date date DEFAULT CURRENT_DATE,
    p_start_date date DEFAULT CURRENT_DATE,
    p_end_date date DEFAULT CURRENT_DATE + INTERVAL '30 days',
    p_contract_amount numeric DEFAULT 0,
    p_monthly_amount numeric DEFAULT 0,
    p_description text DEFAULT NULL,
    p_terms text DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_contract_id uuid;
    v_contract_number text;
    v_journal_entry_id uuid;
    v_journal_entry_number text;
    v_company_id uuid;
    v_customer_exists boolean;
    v_vehicle_available boolean;
    v_result jsonb;
BEGIN
    -- Get company ID from user profile
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE user_id = COALESCE(p_created_by, auth.uid());
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User company not found',
            'error_code', 'COMPANY_NOT_FOUND'
        );
    END IF;
    
    -- Validate customer exists and is active
    SELECT EXISTS(
        SELECT 1 FROM public.customers 
        WHERE id = p_customer_id 
        AND company_id = v_company_id 
        AND is_active = true
        AND is_blacklisted = false
    ) INTO v_customer_exists;
    
    IF NOT v_customer_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Customer not found or inactive',
            'error_code', 'CUSTOMER_INVALID'
        );
    END IF;
    
    -- Validate vehicle availability if specified
    IF p_vehicle_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.vehicles 
            WHERE id = p_vehicle_id 
            AND company_id = v_company_id 
            AND status IN ('available', 'reserved')
        ) INTO v_vehicle_available;
        
        IF NOT v_vehicle_available THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Vehicle not available',
                'error_code', 'VEHICLE_UNAVAILABLE'
            );
        END IF;
    END IF;
    
    -- Generate contract number if not provided
    IF p_contract_number IS NULL OR p_contract_number = '' THEN
        v_contract_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.contracts 
            WHERE company_id = v_company_id 
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::text, 4, '0');
    ELSE
        v_contract_number := p_contract_number;
    END IF;
    
    -- Check for duplicate contract number
    IF EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE contract_number = v_contract_number 
        AND company_id = v_company_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract number already exists',
            'error_code', 'DUPLICATE_CONTRACT_NUMBER'
        );
    END IF;
    
    -- Generate new contract ID
    v_contract_id := gen_random_uuid();
    
    -- Create the contract
    BEGIN
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
            cost_center_id,
            created_by,
            status
        ) VALUES (
            v_contract_id,
            v_company_id,
            p_customer_id,
            p_vehicle_id,
            v_contract_number,
            p_contract_type,
            p_contract_date,
            p_start_date,
            p_end_date,
            p_contract_amount,
            p_monthly_amount,
            p_description,
            p_terms,
            p_cost_center_id,
            COALESCE(p_created_by, auth.uid()),
            'draft'
        );
        
        -- Mark vehicle as reserved if specified
        IF p_vehicle_id IS NOT NULL THEN
            UPDATE public.vehicles 
            SET status = 'reserved'
            WHERE id = p_vehicle_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to create contract: ' || SQLERRM,
                'error_code', 'CONTRACT_CREATION_FAILED'
            );
    END;
    
    -- Try to create journal entry (optional - don't fail if this fails)
    BEGIN
        -- Get appropriate accounts
        DECLARE
            v_receivable_account_id uuid;
            v_revenue_account_id uuid;
        BEGIN
            -- Get receivables account
            SELECT id INTO v_receivable_account_id
            FROM public.chart_of_accounts
            WHERE company_id = v_company_id
            AND account_type = 'assets'
            AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
            AND is_active = true
            LIMIT 1;
            
            -- Get revenue account
            SELECT id INTO v_revenue_account_id
            FROM public.chart_of_accounts
            WHERE company_id = v_company_id
            AND account_type = 'revenue'
            AND (account_name ILIKE '%rental%' OR account_name ILIKE '%إيجار%' OR account_name ILIKE '%sales%')
            AND is_active = true
            LIMIT 1;
            
            -- Create journal entry if we have the required accounts
            IF v_receivable_account_id IS NOT NULL AND v_revenue_account_id IS NOT NULL THEN
                -- Generate journal entry number
                v_journal_entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((
                    SELECT COUNT(*) + 1 
                    FROM public.journal_entries 
                    WHERE company_id = v_company_id 
                    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                )::text, 4, '0');
                
                -- Create journal entry
                INSERT INTO public.journal_entries (
                    id,
                    company_id,
                    entry_number,
                    entry_date,
                    description,
                    reference_type,
                    reference_id,
                    total_debit,
                    total_credit,
                    status,
                    created_by
                ) VALUES (
                    gen_random_uuid(),
                    v_company_id,
                    v_journal_entry_number,
                    p_contract_date,
                    'Contract: ' || v_contract_number,
                    'contract',
                    v_contract_id,
                    p_contract_amount,
                    p_contract_amount,
                    'draft',
                    COALESCE(p_created_by, auth.uid())
                ) RETURNING id INTO v_journal_entry_id;
                
                -- Update contract with journal entry ID
                UPDATE public.contracts 
                SET journal_entry_id = v_journal_entry_id
                WHERE id = v_contract_id;
            END IF;
        END;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the journal entry error but don't fail the contract creation
            RAISE WARNING 'Failed to create journal entry for contract %: %', v_contract_id, SQLERRM;
            v_journal_entry_id := NULL;
            v_journal_entry_number := NULL;
    END;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number
    );
    
    -- Add journal entry info if created
    IF v_journal_entry_id IS NOT NULL THEN
        v_result := v_result || jsonb_build_object(
            'journal_entry_id', v_journal_entry_id,
            'journal_entry_number', v_journal_entry_number
        );
    ELSE
        v_result := v_result || jsonb_build_object(
            'requires_manual_entry', true,
            'warnings', jsonb_build_array('Journal entry requires manual creation')
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unexpected error: ' || SQLERRM,
            'error_code', 'UNEXPECTED_ERROR'
        );
END;
$function$;

-- Create validation functions
CREATE OR REPLACE FUNCTION public.validate_contract_realtime(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"valid": true, "alerts": [], "warnings": [], "errors": []}'::jsonb;
    v_company_id uuid;
    customer_status text;
    vehicle_status text;
BEGIN
    -- Get company ID
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF v_company_id IS NULL THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}', 
            validation_result->'errors' || '["Company not found"]'::jsonb);
        RETURN validation_result;
    END IF;
    
    -- Validate customer
    IF (contract_data->>'customer_id') IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN is_blacklisted = true THEN 'blacklisted'
                WHEN is_active = false THEN 'inactive'
                ELSE 'active'
            END INTO customer_status
        FROM public.customers
        WHERE id = (contract_data->>'customer_id')::uuid
        AND company_id = v_company_id;
        
        IF customer_status = 'blacklisted' THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false');
            validation_result := jsonb_set(validation_result, '{errors}', 
                validation_result->'errors' || '["Customer is blacklisted"]'::jsonb);
        ELSIF customer_status = 'inactive' THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false');
            validation_result := jsonb_set(validation_result, '{errors}', 
                validation_result->'errors' || '["Customer is inactive"]'::jsonb);
        ELSIF customer_status IS NULL THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false');
            validation_result := jsonb_set(validation_result, '{errors}', 
                validation_result->'errors' || '["Customer not found"]'::jsonb);
        END IF;
    END IF;
    
    -- Validate vehicle if specified
    IF (contract_data->>'vehicle_id') IS NOT NULL AND (contract_data->>'vehicle_id') != '' THEN
        SELECT status INTO vehicle_status
        FROM public.vehicles
        WHERE id = (contract_data->>'vehicle_id')::uuid
        AND company_id = v_company_id;
        
        IF vehicle_status NOT IN ('available', 'reserved') THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false');
            validation_result := jsonb_set(validation_result, '{errors}', 
                validation_result->'errors' || '["Vehicle not available"]'::jsonb);
        ELSIF vehicle_status IS NULL THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false');
            validation_result := jsonb_set(validation_result, '{errors}', 
                validation_result->'errors' || '["Vehicle not found"]'::jsonb);
        END IF;
    END IF;
    
    RETURN validation_result;
END;
$function$;

-- Create vehicle availability check function
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
AS $function$
DECLARE
    v_company_id uuid;
    conflicts_count integer;
    vehicle_status text;
BEGIN
    -- Get company ID
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    -- Check vehicle exists and get status
    SELECT status INTO vehicle_status
    FROM public.vehicles
    WHERE id = vehicle_id_param
    AND company_id = v_company_id;
    
    IF vehicle_status IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'Vehicle not found'
        );
    END IF;
    
    IF vehicle_status NOT IN ('available', 'reserved') THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'Vehicle not available (status: ' || vehicle_status || ')'
        );
    END IF;
    
    -- Check for date conflicts
    SELECT COUNT(*) INTO conflicts_count
    FROM public.contracts
    WHERE vehicle_id = vehicle_id_param
    AND status IN ('active', 'draft')
    AND (exclude_contract_id_param IS NULL OR id != exclude_contract_id_param)
    AND (
        (start_date <= end_date_param AND end_date >= start_date_param)
    );
    
    IF conflicts_count > 0 THEN
        RETURN jsonb_build_object(
            'available', false,
            'reason', 'Vehicle has conflicting bookings'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'available', true,
        'reason', 'Vehicle is available'
    );
END;
$function$;

-- Create customer eligibility check function
CREATE OR REPLACE FUNCTION public.check_customer_eligibility_realtime(customer_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_company_id uuid;
    customer_record record;
BEGIN
    -- Get company ID
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    -- Get customer info
    SELECT is_active, is_blacklisted, blacklist_reason
    INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param
    AND company_id = v_company_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'Customer not found'
        );
    END IF;
    
    IF customer_record.is_blacklisted THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'Customer is blacklisted: ' || COALESCE(customer_record.blacklist_reason, 'No reason specified')
        );
    END IF;
    
    IF NOT customer_record.is_active THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'Customer is inactive'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'eligible', true,
        'reason', 'Customer is eligible'
    );
END;
$function$;