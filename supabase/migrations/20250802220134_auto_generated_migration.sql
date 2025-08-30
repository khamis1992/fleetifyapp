-- Clean up conflicting contract creation functions
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(jsonb);
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(uuid, uuid, uuid, character varying, text, date, date, date, numeric, numeric, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry_enhanced(uuid);

-- Create unified contract creation function with individual parameters
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_number character varying DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
    p_contract_date date DEFAULT CURRENT_DATE,
    p_start_date date DEFAULT CURRENT_DATE,
    p_end_date date DEFAULT CURRENT_DATE + INTERVAL '30 days',
    p_contract_amount numeric DEFAULT 0,
    p_monthly_amount numeric DEFAULT 0,
    p_description text DEFAULT NULL,
    p_terms text DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_company_id uuid;
    v_contract_id uuid;
    v_journal_entry_id uuid;
    v_contract_number character varying;
    v_receivable_account_id uuid;
    v_revenue_account_id uuid;
    v_result jsonb;
    v_error_code text;
    v_error_message text;
BEGIN
    -- Get user's company
    v_company_id := public.get_user_company_secure_cached(COALESCE(p_created_by, auth.uid()));
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'COMPANY_NOT_FOUND',
            'error_message', 'User company not found'
        );
    END IF;
    
    -- Generate contract number if not provided
    IF p_contract_number IS NULL THEN
        v_contract_number := 'CON-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || 
                           LPAD((SELECT COUNT(*) + 1 FROM public.contracts WHERE company_id = v_company_id 
                                AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE))::TEXT, 4, '0');
    ELSE
        v_contract_number := p_contract_number;
    END IF;
    
    -- Validate contract data
    DECLARE
        validation_result jsonb;
    BEGIN
        validation_result := public.validate_contract_data(jsonb_build_object(
            'customer_id', p_customer_id,
            'vehicle_id', p_vehicle_id,
            'start_date', p_start_date,
            'end_date', p_end_date
        ));
        
        IF NOT (validation_result->>'valid')::boolean THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'VALIDATION_FAILED',
                'error_message', 'Contract validation failed',
                'errors', validation_result->'errors'
            );
        END IF;
    END;
    
    -- Create contract
    BEGIN
        INSERT INTO public.contracts (
            id, company_id, customer_id, vehicle_id, contract_number,
            contract_type, contract_date, start_date, end_date,
            contract_amount, monthly_amount, description, terms,
            cost_center_id, created_by, status
        ) VALUES (
            gen_random_uuid(), v_company_id, p_customer_id, p_vehicle_id, v_contract_number,
            p_contract_type, p_contract_date, p_start_date, p_end_date,
            p_contract_amount, p_monthly_amount, p_description, p_terms,
            p_cost_center_id, COALESCE(p_created_by, auth.uid()), 'draft'
        ) RETURNING id INTO v_contract_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_code = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
            RETURN jsonb_build_object(
                'success', false,
                'error_code', v_error_code,
                'error_message', 'Failed to create contract: ' || v_error_message
            );
    END;
    
    -- Create journal entry for the contract
    BEGIN
        -- Get account mappings
        v_receivable_account_id := public.get_mapped_account_enhanced(v_company_id, 'RECEIVABLES');
        v_revenue_account_id := public.get_mapped_account_enhanced(v_company_id, 'RENTAL_REVENUE');
        
        -- Only create journal entry if we have the required accounts
        IF v_receivable_account_id IS NOT NULL AND v_revenue_account_id IS NOT NULL THEN
            -- Create journal entry
            INSERT INTO public.journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, reference_id, total_debit, total_credit,
                status, created_by
            ) VALUES (
                gen_random_uuid(), v_company_id,
                public.generate_journal_entry_number(v_company_id),
                p_contract_date,
                'Contract Revenue Recognition - ' || v_contract_number,
                'contract', v_contract_id,
                p_contract_amount, p_contract_amount,
                'draft', COALESCE(p_created_by, auth.uid())
            ) RETURNING id INTO v_journal_entry_id;
            
            -- Add journal entry lines
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id,
                line_number, line_description, debit_amount, credit_amount
            ) VALUES 
            (
                gen_random_uuid(), v_journal_entry_id, v_receivable_account_id, p_cost_center_id,
                1, 'Accounts Receivable - ' || v_contract_number, p_contract_amount, 0
            ),
            (
                gen_random_uuid(), v_journal_entry_id, v_revenue_account_id, p_cost_center_id,
                2, 'Contract Revenue - ' || v_contract_number, 0, p_contract_amount
            );
            
            -- Update contract with journal entry ID
            UPDATE public.contracts 
            SET journal_entry_id = v_journal_entry_id 
            WHERE id = v_contract_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_code = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
            -- Journal entry creation failed, but contract was created successfully
            -- Log this but don't fail the entire operation
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, error_message
            ) VALUES (
                v_company_id, v_contract_id, 'journal_entry_creation', 'failed',
                'Journal entry creation failed: ' || v_error_message
            );
    END;
    
    -- Prepare result
    v_result := jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number,
        'journal_entry_id', v_journal_entry_id
    );
    
    -- Add warnings if journal entry was not created
    IF v_journal_entry_id IS NULL THEN
        v_result := jsonb_set(v_result, '{warnings}', 
            '["Journal entry could not be created automatically. Please create manually if needed."]'::jsonb);
        v_result := jsonb_set(v_result, '{requires_manual_entry}', 'true'::jsonb);
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_code = RETURNED_SQLSTATE, v_error_message = MESSAGE_TEXT;
        RETURN jsonb_build_object(
            'success', false,
            'error_code', v_error_code,
            'error_message', v_error_message
        );
END;
$function$;

-- Create helper function to generate journal entry numbers
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    entry_count INTEGER;
    year_suffix TEXT;
BEGIN
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    SELECT COUNT(*) + 1 INTO entry_count
    FROM public.journal_entries 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    RETURN 'JE-' || year_suffix || '-' || LPAD(entry_count::TEXT, 4, '0');
END;
$function$;