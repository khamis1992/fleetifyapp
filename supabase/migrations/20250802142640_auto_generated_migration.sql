-- Drop existing function and recreate with enhanced functionality
DROP FUNCTION IF EXISTS public.cleanup_orphaned_contract_logs();

-- Fix transaction isolation issues and enhance contract creation process

-- Enhanced contract creation function with better transaction handling
CREATE OR REPLACE FUNCTION public.create_contract_safe(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_id UUID;
    journal_entry_id UUID;
    result JSONB;
    retry_count INTEGER := 0;
    max_retries INTEGER := 3;
    creation_step TEXT;
    user_id UUID;
    company_id UUID;
BEGIN
    -- Get current user and company
    user_id := auth.uid();
    company_id := (contract_data->>'company_id')::UUID;
    
    -- Validate required data
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required';
    END IF;
    
    -- Log start of contract creation
    creation_step := 'validation';
    INSERT INTO public.contract_creation_log (
        contract_id, company_id, step_name, step_status, 
        step_details, created_by
    ) VALUES (
        NULL, company_id, creation_step, 'started',
        jsonb_build_object('contract_data', contract_data),
        user_id
    );
    
    -- Start main transaction block
    BEGIN
        -- Step 1: Create the contract
        creation_step := 'contract_creation';
        
        INSERT INTO public.contracts (
            id, company_id, customer_id, vehicle_id, contract_number,
            contract_type, start_date, end_date, rental_days,
            daily_rate, contract_amount, monthly_amount, security_deposit,
            insurance_amount, status, notes, terms_conditions,
            pickup_location, return_location, created_by, cost_center_id
        ) VALUES (
            gen_random_uuid(),
            company_id,
            (contract_data->>'customer_id')::UUID,
            NULLIF(contract_data->>'vehicle_id', '')::UUID,
            contract_data->>'contract_number',
            contract_data->>'contract_type',
            (contract_data->>'start_date')::DATE,
            (contract_data->>'end_date')::DATE,
            (contract_data->>'rental_days')::INTEGER,
            (contract_data->>'daily_rate')::NUMERIC,
            (contract_data->>'contract_amount')::NUMERIC,
            (contract_data->>'monthly_amount')::NUMERIC,
            (contract_data->>'security_deposit')::NUMERIC,
            (contract_data->>'insurance_amount')::NUMERIC,
            'draft',
            contract_data->>'notes',
            contract_data->>'terms_conditions',
            contract_data->>'pickup_location',
            contract_data->>'return_location',
            user_id,
            NULLIF(contract_data->>'cost_center_id', '')::UUID
        ) RETURNING id INTO contract_id;
        
        -- Log contract creation success
        INSERT INTO public.contract_creation_log (
            contract_id, company_id, step_name, step_status,
            step_details, created_by
        ) VALUES (
            contract_id, company_id, creation_step, 'completed',
            jsonb_build_object('contract_id', contract_id),
            user_id
        );
        
        -- Force commit of contract creation before journal entry
        -- This ensures the contract is visible to subsequent operations
        COMMIT;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log contract creation failure
            INSERT INTO public.contract_creation_log (
                contract_id, company_id, step_name, step_status,
                step_details, error_message, created_by
            ) VALUES (
                contract_id, company_id, creation_step, 'failed',
                jsonb_build_object('contract_data', contract_data),
                SQLERRM, user_id
            );
            RAISE;
    END;
    
    -- Start new transaction for journal entry creation
    BEGIN
        -- Step 2: Create journal entry with retry mechanism
        creation_step := 'journal_entry_creation';
        
        WHILE retry_count < max_retries LOOP
            BEGIN
                -- Verify contract exists before creating journal entry
                IF NOT EXISTS(SELECT 1 FROM public.contracts WHERE id = contract_id) THEN
                    RAISE EXCEPTION 'Contract % not found after creation', contract_id;
                END IF;
                
                -- Create journal entry
                SELECT public.create_contract_journal_entry(
                    contract_id, 
                    'contract_creation',
                    (contract_data->>'contract_amount')::NUMERIC
                ) INTO journal_entry_id;
                
                -- Log journal entry success
                INSERT INTO public.contract_creation_log (
                    contract_id, company_id, step_name, step_status,
                    step_details, created_by
                ) VALUES (
                    contract_id, company_id, creation_step, 'completed',
                    jsonb_build_object('journal_entry_id', journal_entry_id),
                    user_id
                );
                
                -- Update contract with journal entry ID
                UPDATE public.contracts 
                SET journal_entry_id = journal_entry_id::UUID
                WHERE id = contract_id;
                
                EXIT; -- Success, exit retry loop
                
            EXCEPTION
                WHEN OTHERS THEN
                    retry_count := retry_count + 1;
                    
                    -- Log retry attempt
                    INSERT INTO public.contract_creation_log (
                        contract_id, company_id, step_name, step_status,
                        step_details, error_message, created_by
                    ) VALUES (
                        contract_id, company_id, creation_step, 'retry_' || retry_count,
                        jsonb_build_object('retry_count', retry_count, 'max_retries', max_retries),
                        SQLERRM, user_id
                    );
                    
                    IF retry_count >= max_retries THEN
                        -- Final failure
                        INSERT INTO public.contract_creation_log (
                            contract_id, company_id, step_name, step_status,
                            step_details, error_message, created_by
                        ) VALUES (
                            contract_id, company_id, creation_step, 'failed',
                            jsonb_build_object('final_retry_count', retry_count),
                            SQLERRM, user_id
                        );
                        
                        -- Return partial success result
                        result := jsonb_build_object(
                            'success', true,
                            'contract_id', contract_id,
                            'journal_entry_id', NULL,
                            'warning', 'Contract created but journal entry failed after retries',
                            'requires_manual_entry', true
                        );
                        RETURN result;
                    END IF;
                    
                    -- Wait briefly before retry (simulated)
                    PERFORM pg_sleep(0.1);
            END;
        END LOOP;
        
        -- Step 3: Update vehicle status if vehicle is specified
        IF (contract_data->>'vehicle_id') IS NOT NULL AND (contract_data->>'vehicle_id') != '' THEN
            creation_step := 'vehicle_status_update';
            
            UPDATE public.vehicles 
            SET status = 'rented', 
                current_contract_id = contract_id,
                updated_at = now()
            WHERE id = (contract_data->>'vehicle_id')::UUID;
            
            -- Log vehicle status update
            INSERT INTO public.contract_creation_log (
                contract_id, company_id, step_name, step_status,
                step_details, created_by
            ) VALUES (
                contract_id, company_id, creation_step, 'completed',
                jsonb_build_object('vehicle_id', contract_data->>'vehicle_id'),
                user_id
            );
        END IF;
        
        -- Log overall success
        INSERT INTO public.contract_creation_log (
            contract_id, company_id, step_name, step_status,
            step_details, created_by
        ) VALUES (
            contract_id, company_id, 'process_completed', 'completed',
            jsonb_build_object('total_steps', 3, 'journal_entry_retries', retry_count),
            user_id
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log final failure
            INSERT INTO public.contract_creation_log (
                contract_id, company_id, step_name, step_status,
                step_details, error_message, created_by
            ) VALUES (
                contract_id, company_id, creation_step, 'failed',
                jsonb_build_object('final_error', true),
                SQLERRM, user_id
            );
            RAISE;
    END;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'journal_entry_id', journal_entry_id,
        'message', 'Contract created successfully'
    );
    
    RETURN result;
END;
$function$;

-- Enhanced journal entry creation function with better validation and logging
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
    contract_id_param UUID,
    entry_type_param TEXT DEFAULT 'contract_creation',
    amount_param NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    journal_entry_id UUID;
    receivables_account_id UUID;
    revenue_account_id UUID;
    entry_amount NUMERIC;
    entry_description TEXT;
    voucher_number TEXT;
    user_id UUID;
BEGIN
    -- Get current user
    user_id := auth.uid();
    
    -- Validate contract exists with comprehensive check
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        -- Additional diagnostic logging
        RAISE LOG 'Contract validation failed for ID: %. User: %. Available contracts: %', 
            contract_id_param, user_id, 
            (SELECT COUNT(*) FROM public.contracts WHERE company_id = (
                SELECT company_id FROM public.profiles WHERE id = user_id LIMIT 1
            ));
        
        RAISE EXCEPTION 'Contract with ID % not found', contract_id_param;
    END IF;
    
    -- Validate user has access to this contract's company
    IF NOT EXISTS(
        SELECT 1 FROM public.profiles p 
        WHERE p.id = user_id 
        AND p.company_id = contract_record.company_id
    ) THEN
        RAISE EXCEPTION 'Access denied to contract company';
    END IF;
    
    -- Determine amount based on entry type
    IF amount_param IS NOT NULL THEN
        entry_amount := amount_param;
    ELSE
        CASE entry_type_param
            WHEN 'contract_creation', 'contract_activation' THEN
                entry_amount := contract_record.contract_amount;
            WHEN 'monthly_billing' THEN
                entry_amount := contract_record.monthly_amount;
            WHEN 'security_deposit' THEN
                entry_amount := contract_record.security_deposit;
            ELSE
                entry_amount := contract_record.contract_amount;
        END CASE;
    END IF;
    
    -- Skip if amount is zero or null
    IF entry_amount IS NULL OR entry_amount <= 0 THEN
        RAISE LOG 'Skipping journal entry for contract % - amount is % (type: %)', 
            contract_id_param, entry_amount, entry_type_param;
        RETURN NULL;
    END IF;
    
    -- Get account mappings with fallback logic
    SELECT chart_of_accounts_id INTO receivables_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = contract_record.company_id
    AND dat.type_code = 'RECEIVABLES'
    AND am.is_active = true
    LIMIT 1;
    
    SELECT chart_of_accounts_id INTO revenue_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = contract_record.company_id
    AND dat.type_code = 'RENTAL_REVENUE'
    AND am.is_active = true
    LIMIT 1;
    
    -- Fallback to sales revenue if rental revenue not found
    IF revenue_account_id IS NULL THEN
        SELECT chart_of_accounts_id INTO revenue_account_id
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = contract_record.company_id
        AND dat.type_code = 'SALES_REVENUE'
        AND am.is_active = true
        LIMIT 1;
    END IF;
    
    -- Validate required accounts exist
    IF receivables_account_id IS NULL THEN
        RAISE EXCEPTION 'No receivables account mapping found for company';
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No revenue account mapping found for company';
    END IF;
    
    -- Generate entry description and voucher number
    entry_description := CASE entry_type_param
        WHEN 'contract_creation' THEN 'Contract Creation - ' || contract_record.contract_number
        WHEN 'contract_activation' THEN 'Contract Activation - ' || contract_record.contract_number
        WHEN 'monthly_billing' THEN 'Monthly Billing - ' || contract_record.contract_number
        WHEN 'security_deposit' THEN 'Security Deposit - ' || contract_record.contract_number
        ELSE 'Contract Entry - ' || contract_record.contract_number
    END;
    
    -- Generate voucher number
    voucher_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
        LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = contract_record.company_id 
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id, company_id, entry_date, description, reference_number,
        total_amount, status, created_by, cost_center_id
    ) VALUES (
        gen_random_uuid(),
        contract_record.company_id,
        CURRENT_DATE,
        entry_description,
        voucher_number,
        entry_amount,
        'posted',
        user_id,
        contract_record.cost_center_id
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines (Debit: Receivables, Credit: Revenue)
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, description,
        debit_amount, credit_amount, cost_center_id
    ) VALUES 
    (
        gen_random_uuid(),
        journal_entry_id,
        receivables_account_id,
        'AR - ' || entry_description,
        entry_amount,
        0,
        contract_record.cost_center_id
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        'Revenue - ' || entry_description,
        0,
        entry_amount,
        contract_record.cost_center_id
    );
    
    RAISE LOG 'Successfully created journal entry % for contract % (amount: %)', 
        journal_entry_id, contract_id_param, entry_amount;
    
    RETURN journal_entry_id;
END;
$function$;

-- Function to cleanup orphaned contract logs and retry failed journal entries
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_contract_logs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cleanup_result JSONB := '{"cleaned_logs": 0, "retried_entries": 0, "errors": []}'::JSONB;
    log_record RECORD;
    retry_count INTEGER := 0;
    cleanup_count INTEGER := 0;
BEGIN
    -- Mark logs as obsolete for contracts that don't exist
    UPDATE public.contract_creation_log 
    SET step_status = 'obsolete',
        error_message = 'Contract no longer exists'
    WHERE contract_id IS NOT NULL 
    AND step_status IN ('started', 'failed')
    AND NOT EXISTS (
        SELECT 1 FROM public.contracts c 
        WHERE c.id = contract_creation_log.contract_id
    );
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    cleanup_result := jsonb_set(cleanup_result, '{cleaned_logs}', cleanup_count::text::jsonb);
    
    -- Retry failed journal entries for contracts that exist but have no journal_entry_id
    FOR log_record IN 
        SELECT DISTINCT ccl.contract_id, ccl.company_id
        FROM public.contract_creation_log ccl
        JOIN public.contracts c ON ccl.contract_id = c.id
        WHERE ccl.step_name = 'journal_entry_creation'
        AND ccl.step_status = 'failed'
        AND c.journal_entry_id IS NULL
        AND c.status IN ('draft', 'active')
        AND ccl.created_at > CURRENT_DATE - INTERVAL '7 days'  -- Only recent failures
    LOOP
        BEGIN
            -- Attempt to create journal entry
            DECLARE
                new_journal_entry_id UUID;
            BEGIN
                SELECT public.create_contract_journal_entry(
                    log_record.contract_id,
                    'contract_creation'
                ) INTO new_journal_entry_id;
                
                IF new_journal_entry_id IS NOT NULL THEN
                    -- Update contract with journal entry ID
                    UPDATE public.contracts 
                    SET journal_entry_id = new_journal_entry_id
                    WHERE id = log_record.contract_id;
                    
                    -- Log successful retry
                    INSERT INTO public.contract_creation_log (
                        contract_id, company_id, step_name, step_status,
                        step_details, created_by
                    ) VALUES (
                        log_record.contract_id, log_record.company_id,
                        'journal_entry_creation', 'completed_retry',
                        jsonb_build_object('journal_entry_id', new_journal_entry_id),
                        auth.uid()
                    );
                    
                    retry_count := retry_count + 1;
                END IF;
            END;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log retry failure
                cleanup_result := jsonb_set(
                    cleanup_result, 
                    '{errors}', 
                    (cleanup_result->'errors') || jsonb_build_array(
                        'Failed to retry journal entry for contract ' || log_record.contract_id || ': ' || SQLERRM
                    )
                );
        END;
    END LOOP;
    
    cleanup_result := jsonb_set(cleanup_result, '{retried_entries}', retry_count::text::jsonb);
    
    RETURN cleanup_result;
END;
$function$;