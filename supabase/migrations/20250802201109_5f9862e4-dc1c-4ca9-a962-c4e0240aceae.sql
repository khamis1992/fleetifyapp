-- Create new function that accepts contract data directly to avoid transaction isolation issues
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry_with_data(
    contract_data jsonb,
    user_id_param uuid DEFAULT NULL::uuid,
    entry_type_param text DEFAULT 'contract_creation'::text,
    amount_param numeric DEFAULT NULL::numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_entry_id UUID;
    receivables_account_id UUID;
    revenue_account_id UUID;
    entry_amount NUMERIC;
    entry_description TEXT;
    voucher_number TEXT;
    current_user_id UUID;
    result jsonb;
    company_id_val UUID;
    contract_id_val UUID;
    contract_number_val TEXT;
    contract_amount_val NUMERIC;
    monthly_amount_val NUMERIC;
    cost_center_id_val UUID;
BEGIN
    -- Get current user
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Extract contract data from jsonb
    company_id_val := (contract_data->>'company_id')::uuid;
    contract_id_val := (contract_data->>'id')::uuid;
    contract_number_val := contract_data->>'contract_number';
    contract_amount_val := (contract_data->>'contract_amount')::numeric;
    monthly_amount_val := (contract_data->>'monthly_amount')::numeric;
    cost_center_id_val := (contract_data->>'cost_center_id')::uuid;
    
    -- Validate required data
    IF company_id_val IS NULL OR contract_id_val IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_CONTRACT_DATA',
            'error_message', 'Missing required contract data (company_id or contract_id)'
        );
    END IF;
    
    -- Validate user access
    IF NOT EXISTS(
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = current_user_id 
        AND p.company_id = company_id_val
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACCESS_DENIED',
            'error_message', 'Access denied to contract company'
        );
    END IF;
    
    -- Determine amount
    IF amount_param IS NOT NULL THEN
        entry_amount := amount_param;
    ELSE
        CASE entry_type_param
            WHEN 'contract_creation', 'contract_activation' THEN
                entry_amount := contract_amount_val;
            WHEN 'monthly_billing' THEN
                entry_amount := monthly_amount_val;
            ELSE
                entry_amount := contract_amount_val;
        END CASE;
    END IF;
    
    -- Skip if amount is zero
    IF entry_amount IS NULL OR entry_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_AMOUNT',
            'error_message', 'Amount is zero or invalid',
            'amount', entry_amount
        );
    END IF;
    
    -- Get account mappings
    receivables_account_id := public.get_mapped_account_enhanced(company_id_val, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_enhanced(company_id_val, 'RENTAL_REVENUE');
    
    -- Fallback to sales revenue
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_enhanced(company_id_val, 'SALES_REVENUE');
    END IF;
    
    -- Validate accounts
    IF receivables_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'RECEIVABLES_ACCOUNT_NOT_FOUND',
            'error_message', 'No receivables account mapping found for company'
        );
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'REVENUE_ACCOUNT_NOT_FOUND',
            'error_message', 'No revenue account mapping found for company'
        );
    END IF;
    
    -- Generate description and voucher
    entry_description := CASE entry_type_param
        WHEN 'contract_creation' THEN 'Contract Creation - ' || contract_number_val
        WHEN 'contract_activation' THEN 'Contract Activation - ' || contract_number_val
        WHEN 'monthly_billing' THEN 'Monthly Billing - ' || contract_number_val
        ELSE 'Contract Entry - ' || contract_number_val
    END;
    
    voucher_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
        LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = company_id_val 
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id, company_id, entry_date, description, reference_number,
        total_amount, status, created_by, cost_center_id
    ) VALUES (
        gen_random_uuid(),
        company_id_val,
        CURRENT_DATE,
        entry_description,
        voucher_number,
        entry_amount,
        'posted',
        current_user_id,
        cost_center_id_val
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, description,
        debit_amount, credit_amount, line_number
    ) VALUES 
    (
        gen_random_uuid(),
        journal_entry_id,
        receivables_account_id,
        entry_description,
        entry_amount,
        0,
        1
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        entry_description,
        0,
        entry_amount,
        2
    );
    
    -- Return success result
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', voucher_number,
        'amount', entry_amount,
        'entry_type', entry_type_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM,
        'error_state', SQLSTATE
    );
END;
$function$;

-- Update the create_contract_safe function to use the new approach
CREATE OR REPLACE FUNCTION public.create_contract_safe(
    company_id_param uuid,
    customer_id_param uuid,
    contract_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_contract_id uuid;
    validation_result jsonb;
    journal_result jsonb;
    contract_number_val text;
    vehicle_id_val uuid;
    contract_type_val text;
    start_date_val date;
    end_date_val date;
    contract_amount_val numeric;
    monthly_amount_val numeric;
    terms_val text;
    description_val text;
    cost_center_id_val uuid;
    full_contract_data jsonb;
    result jsonb;
BEGIN
    -- Generate new contract ID
    new_contract_id := gen_random_uuid();
    
    -- Extract contract data
    contract_number_val := contract_data->>'contract_number';
    vehicle_id_val := CASE 
        WHEN contract_data->>'vehicle_id' = 'none' OR contract_data->>'vehicle_id' = '' THEN NULL
        ELSE (contract_data->>'vehicle_id')::uuid
    END;
    contract_type_val := COALESCE(contract_data->>'contract_type', 'rental');
    start_date_val := (contract_data->>'start_date')::date;
    end_date_val := (contract_data->>'end_date')::date;
    contract_amount_val := (contract_data->>'contract_amount')::numeric;
    monthly_amount_val := (contract_data->>'monthly_amount')::numeric;
    terms_val := contract_data->>'terms';
    description_val := contract_data->>'description';
    cost_center_id_val := (contract_data->>'cost_center_id')::uuid;
    
    -- Validate contract data
    validation_result := public.validate_contract_data(contract_data || jsonb_build_object(
        'customer_id', customer_id_param,
        'company_id', company_id_param
    ));
    
    IF NOT (validation_result->>'valid')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'VALIDATION_FAILED',
            'error_message', 'Contract validation failed',
            'validation_errors', validation_result->'errors'
        );
    END IF;
    
    -- Generate contract number if not provided
    IF contract_number_val IS NULL OR contract_number_val = '' THEN
        contract_number_val := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
            LPAD((
                SELECT COUNT(*) + 1 
                FROM public.contracts 
                WHERE company_id = company_id_param 
                AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
            )::TEXT, 4, '0');
    END IF;
    
    -- Prepare full contract data for journal entry creation
    full_contract_data := jsonb_build_object(
        'id', new_contract_id,
        'company_id', company_id_param,
        'customer_id', customer_id_param,
        'contract_number', contract_number_val,
        'contract_type', contract_type_val,
        'contract_amount', contract_amount_val,
        'monthly_amount', monthly_amount_val,
        'cost_center_id', cost_center_id_val,
        'vehicle_id', vehicle_id_val,
        'start_date', start_date_val,
        'end_date', end_date_val
    );
    
    BEGIN
        -- Create the contract first
        INSERT INTO public.contracts (
            id,
            company_id,
            customer_id,
            contract_number,
            contract_date,
            start_date,
            end_date,
            contract_amount,
            monthly_amount,
            vehicle_id,
            contract_type,
            description,
            terms,
            status,
            created_by,
            cost_center_id
        ) VALUES (
            new_contract_id,
            company_id_param,
            customer_id_param,
            contract_number_val,
            CURRENT_DATE,
            start_date_val,
            end_date_val,
            contract_amount_val,
            monthly_amount_val,
            vehicle_id_val,
            contract_type_val,
            description_val,
            terms_val,
            'draft',
            auth.uid(),
            cost_center_id_val
        );
        
        -- Try to create journal entry using contract data
        journal_result := public.create_contract_journal_entry_with_data(
            full_contract_data,
            auth.uid(),
            'contract_creation',
            contract_amount_val
        );
        
        -- Update contract with journal entry ID if successful
        IF (journal_result->>'success')::boolean THEN
            UPDATE public.contracts 
            SET 
                journal_entry_id = (journal_result->>'journal_entry_id')::uuid,
                status = 'active'
            WHERE id = new_contract_id;
            
            -- Update vehicle status if applicable
            IF vehicle_id_val IS NOT NULL THEN
                UPDATE public.vehicles 
                SET status = 'rented' 
                WHERE id = vehicle_id_val;
            END IF;
            
            result := jsonb_build_object(
                'success', true,
                'contract_id', new_contract_id,
                'contract_number', contract_number_val,
                'status', 'active',
                'journal_entry_created', true,
                'journal_entry_id', journal_result->>'journal_entry_id',
                'journal_entry_number', journal_result->>'journal_entry_number'
            );
        ELSE
            -- Journal entry failed, but keep contract in draft status
            result := jsonb_build_object(
                'success', true,
                'contract_id', new_contract_id,
                'contract_number', contract_number_val,
                'status', 'draft',
                'journal_entry_created', false,
                'journal_entry_error', journal_result->>'error_message',
                'warning', 'Contract created but journal entry failed. You can retry journal entry creation later.'
            );
        END IF;
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error
        INSERT INTO public.contract_creation_log (
            company_id,
            contract_id,
            operation_step,
            status,
            error_message,
            metadata
        ) VALUES (
            company_id_param,
            new_contract_id,
            'contract_creation',
            'failed',
            SQLERRM,
            jsonb_build_object(
                'error_state', SQLSTATE,
                'contract_data', contract_data
            )
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_CREATION_FAILED',
            'error_message', SQLERRM,
            'error_state', SQLSTATE
        );
    END;
END;
$function$;