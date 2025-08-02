-- Drop and recreate the logging function with proper parameters
DROP FUNCTION IF EXISTS public.log_contract_creation_step(uuid,uuid,text,text,text,jsonb);

-- Create the main contract creation function with proper error handling
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    contract_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    new_contract_id uuid;
    contract_number_value text;
    journal_entry_id uuid;
    journal_entry_number text;
    result jsonb;
    validation_result jsonb;
    mapped_account_id uuid;
    revenue_account_id uuid;
    receivables_account_id uuid;
    has_journal_requirements boolean := false;
    contract_amount numeric;
    customer_id_value uuid;
    company_id_value uuid;
    cost_center_id_value uuid;
    start_time timestamp := clock_timestamp();
    execution_time_ms integer;
BEGIN
    -- Start logging
    RAISE LOG 'Starting contract creation with journal entry: %', contract_data;

    -- Extract and validate required fields
    BEGIN
        company_id_value := (contract_data->>'company_id')::uuid;
        customer_id_value := (contract_data->>'customer_id')::uuid;
        contract_amount := (contract_data->>'contract_amount')::numeric;
        
        IF company_id_value IS NULL OR customer_id_value IS NULL THEN
            RAISE EXCEPTION 'Company ID and Customer ID are required';
        END IF;
        
        IF contract_amount IS NULL OR contract_amount < 0 THEN
            RAISE EXCEPTION 'Valid contract amount is required';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid contract data format: %', SQLERRM;
    END;

    -- Validate contract data
    BEGIN
        validation_result := public.validate_contract_data(contract_data);
        
        IF (validation_result->>'valid')::boolean = false THEN
            result := jsonb_build_object(
                'success', false,
                'error', 'Validation failed',
                'errors', validation_result->'errors'
            );
            RETURN result;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Validation function error: %', SQLERRM;
        -- Continue with creation if validation function fails
    END;

    -- Generate contract number if not provided
    contract_number_value := contract_data->>'contract_number';
    IF contract_number_value IS NULL OR contract_number_value = '' THEN
        contract_number_value := public.generate_contract_number(company_id_value);
    END IF;

    -- Get default cost center if not provided
    cost_center_id_value := (contract_data->>'cost_center_id')::uuid;
    IF cost_center_id_value IS NULL THEN
        cost_center_id_value := public.get_customer_default_cost_center(customer_id_value);
    END IF;

    -- Create the contract first
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
            status,
            created_by,
            cost_center_id
        ) VALUES (
            gen_random_uuid(),
            company_id_value,
            customer_id_value,
            CASE 
                WHEN contract_data->>'vehicle_id' = 'none' OR contract_data->>'vehicle_id' = '' 
                THEN NULL 
                ELSE (contract_data->>'vehicle_id')::uuid 
            END,
            contract_number_value,
            COALESCE(contract_data->>'contract_type', 'rental'),
            COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
            (contract_data->>'start_date')::date,
            (contract_data->>'end_date')::date,
            contract_amount,
            COALESCE((contract_data->>'monthly_amount')::numeric, contract_amount),
            contract_data->>'description',
            contract_data->>'terms',
            'active',
            COALESCE((contract_data->>'created_by')::uuid, auth.uid()),
            cost_center_id_value
        ) RETURNING id INTO new_contract_id;

        RAISE LOG 'Contract created successfully with ID: %', new_contract_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create contract: %', SQLERRM;
    END;

    -- Check if journal entry is needed (amount > 0)
    has_journal_requirements := contract_amount > 0;

    IF has_journal_requirements THEN
        BEGIN
            -- Get mapped accounts for journal entry
            receivables_account_id := public.get_mapped_account_enhanced(company_id_value, 'RECEIVABLES');
            revenue_account_id := public.get_mapped_account_enhanced(company_id_value, 'RENTAL_REVENUE');
            
            -- Fall back to sales revenue if rental revenue not found
            IF revenue_account_id IS NULL THEN
                revenue_account_id := public.get_mapped_account_enhanced(company_id_value, 'SALES_REVENUE');
            END IF;

            -- Create journal entry if accounts are mapped
            IF receivables_account_id IS NOT NULL AND revenue_account_id IS NOT NULL THEN
                -- Generate journal entry number
                journal_entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD((
                    SELECT COUNT(*) + 1 
                    FROM public.journal_entries 
                    WHERE company_id = company_id_value 
                    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                )::TEXT, 4, '0');

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
                    company_id_value,
                    journal_entry_number,
                    COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
                    'Contract Revenue - ' || contract_number_value,
                    'contract',
                    new_contract_id,
                    contract_amount,
                    contract_amount,
                    'posted',
                    COALESCE((contract_data->>'created_by')::uuid, auth.uid())
                ) RETURNING id INTO journal_entry_id;

                -- Create journal entry lines
                -- Debit: Accounts Receivable
                INSERT INTO public.journal_entry_lines (
                    id,
                    journal_entry_id,
                    account_id,
                    cost_center_id,
                    line_number,
                    line_description,
                    debit_amount,
                    credit_amount
                ) VALUES (
                    gen_random_uuid(),
                    journal_entry_id,
                    receivables_account_id,
                    cost_center_id_value,
                    1,
                    'Accounts Receivable - Contract ' || contract_number_value,
                    contract_amount,
                    0
                );

                -- Credit: Revenue
                INSERT INTO public.journal_entry_lines (
                    id,
                    journal_entry_id,
                    account_id,
                    cost_center_id,
                    line_number,
                    line_description,
                    debit_amount,
                    credit_amount
                ) VALUES (
                    gen_random_uuid(),
                    journal_entry_id,
                    revenue_account_id,
                    cost_center_id_value,
                    2,
                    'Revenue - Contract ' || contract_number_value,
                    0,
                    contract_amount
                );

                -- Update contract with journal entry reference
                UPDATE public.contracts 
                SET journal_entry_id = journal_entry_id 
                WHERE id = new_contract_id;

                RAISE LOG 'Journal entry created successfully with ID: %', journal_entry_id;

            ELSE
                RAISE WARNING 'Account mapping not found: receivables=%, revenue=%', receivables_account_id, revenue_account_id;
                
                -- Create contract without journal entry but flag for manual creation
                result := jsonb_build_object(
                    'success', true,
                    'contract_id', new_contract_id,
                    'contract_number', contract_number_value,
                    'requires_manual_entry', true,
                    'warnings', jsonb_build_array('Journal entry requires manual creation due to missing account mappings')
                );
                
                execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
                
                RAISE LOG 'Contract created successfully but requires manual journal entry. Execution time: %ms', execution_time_ms;
                
                RETURN result;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Journal entry creation failed: %', SQLERRM;
            
            -- Contract was created successfully, but journal entry failed
            result := jsonb_build_object(
                'success', true,
                'contract_id', new_contract_id,
                'contract_number', contract_number_value,
                'requires_manual_entry', true,
                'warnings', jsonb_build_array('Contract created but journal entry failed: ' || SQLERRM)
            );
            
            execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
            
            RAISE LOG 'Contract created with journal entry error. Execution time: %ms', execution_time_ms;
            
            RETURN result;
        END;
    END IF;

    -- Calculate execution time
    execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;

    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', new_contract_id,
        'contract_number', contract_number_value,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', journal_entry_number,
        'execution_time_ms', execution_time_ms
    );

    RAISE LOG 'Contract creation completed successfully. Execution time: %ms', execution_time_ms;

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    -- Clean up any partially created records
    IF new_contract_id IS NOT NULL THEN
        DELETE FROM public.contracts WHERE id = new_contract_id;
    END IF;
    
    execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
    
    RAISE LOG 'Contract creation failed after %ms: %', execution_time_ms, SQLERRM;
    
    -- Return error result
    result := jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'execution_time_ms', execution_time_ms
    );
    
    RETURN result;
END;
$$;