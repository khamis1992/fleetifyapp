-- Drop the problematic separate function
DROP FUNCTION IF EXISTS public.create_contract_journal_entry_enhanced(uuid);

-- Update the main contract creation function to inline journal entry creation
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    p_company_id uuid,
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
    p_contract_date date DEFAULT CURRENT_DATE,
    p_start_date date DEFAULT CURRENT_DATE,
    p_end_date date DEFAULT NULL,
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
AS $$
DECLARE
    new_contract_id uuid;
    new_contract_number text;
    journal_entry_id uuid;
    journal_entry_number text;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
    validation_result jsonb;
    result jsonb;
    start_time timestamp;
    execution_time integer;
BEGIN
    start_time := clock_timestamp();
    
    -- Log operation start
    INSERT INTO public.contract_creation_log (
        company_id, operation_step, status, metadata, created_at
    ) VALUES (
        p_company_id, 'validation', 'started', 
        jsonb_build_object('customer_id', p_customer_id, 'vehicle_id', p_vehicle_id), 
        now()
    );
    
    -- Validate contract data
    validation_result := public.validate_contract_data(jsonb_build_object(
        'customer_id', p_customer_id,
        'vehicle_id', p_vehicle_id,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'contract_amount', p_contract_amount
    ));
    
    IF NOT (validation_result->>'valid')::boolean THEN
        INSERT INTO public.contract_creation_log (
            company_id, operation_step, status, error_message, created_at
        ) VALUES (
            p_company_id, 'validation', 'failed', 
            'Validation failed: ' || (validation_result->>'errors')::text, 
            now()
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'VALIDATION_FAILED',
            'error_message', 'Contract validation failed',
            'errors', validation_result->'errors'
        );
    END IF;
    
    -- Log successful validation
    INSERT INTO public.contract_creation_log (
        company_id, operation_step, status, created_at
    ) VALUES (
        p_company_id, 'validation', 'completed', now()
    );
    
    -- Generate contract number
    new_contract_number := 'CON-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.contracts 
        WHERE company_id = p_company_id 
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Log contract creation start
    INSERT INTO public.contract_creation_log (
        company_id, operation_step, status, metadata, created_at
    ) VALUES (
        p_company_id, 'contract_creation', 'started', 
        jsonb_build_object('contract_number', new_contract_number), 
        now()
    );
    
    -- Create the contract
    INSERT INTO public.contracts (
        id, company_id, customer_id, vehicle_id, contract_number,
        contract_type, contract_date, start_date, end_date,
        contract_amount, monthly_amount, description, terms,
        cost_center_id, created_by, status
    ) VALUES (
        gen_random_uuid(), p_company_id, p_customer_id, p_vehicle_id, new_contract_number,
        p_contract_type, p_contract_date, p_start_date, p_end_date,
        p_contract_amount, p_monthly_amount, p_description, p_terms,
        p_cost_center_id, COALESCE(p_created_by, auth.uid()), 'draft'
    ) RETURNING id INTO new_contract_id;
    
    -- Log successful contract creation
    INSERT INTO public.contract_creation_log (
        contract_id, company_id, operation_step, status, metadata, created_at
    ) VALUES (
        new_contract_id, p_company_id, 'contract_creation', 'completed', 
        jsonb_build_object('contract_id', new_contract_id, 'contract_number', new_contract_number), 
        now()
    );
    
    -- Start journal entry creation (inline)
    INSERT INTO public.contract_creation_log (
        contract_id, company_id, operation_step, status, created_at
    ) VALUES (
        new_contract_id, p_company_id, 'journal_entry_creation', 'started', now()
    );
    
    -- Get account mappings for journal entry
    receivable_account_id := public.get_mapped_account_id(p_company_id, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_id(p_company_id, 'RENTAL_REVENUE');
    
    -- Get sales cost center
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = p_company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Only create journal entry if we have the required accounts
    IF receivable_account_id IS NOT NULL AND revenue_account_id IS NOT NULL THEN
        -- Generate journal entry number
        journal_entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = p_company_id 
            AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        )::TEXT, 4, '0');
        
        -- Create journal entry
        INSERT INTO public.journal_entries (
            id, company_id, entry_number, entry_date, description,
            reference_type, reference_id, total_debit, total_credit,
            status, created_by
        ) VALUES (
            gen_random_uuid(), p_company_id, journal_entry_number, p_contract_date,
            'Contract Revenue Recognition - ' || new_contract_number,
            'contract', new_contract_id, p_contract_amount, p_contract_amount,
            'draft', COALESCE(p_created_by, auth.uid())
        ) RETURNING id INTO journal_entry_id;
        
        -- Create debit entry (Accounts Receivable)
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id,
            line_number, line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, receivable_account_id, sales_cost_center_id,
            1, 'Accounts Receivable - ' || new_contract_number, p_contract_amount, 0
        );
        
        -- Create credit entry (Revenue)
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id,
            line_number, line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, revenue_account_id, sales_cost_center_id,
            2, 'Contract Revenue - ' || new_contract_number, 0, p_contract_amount
        );
        
        -- Update contract with journal entry reference
        UPDATE public.contracts 
        SET journal_entry_id = journal_entry_id 
        WHERE id = new_contract_id;
        
        -- Log successful journal entry creation
        INSERT INTO public.contract_creation_log (
            contract_id, company_id, operation_step, status, metadata, created_at
        ) VALUES (
            new_contract_id, p_company_id, 'journal_entry_creation', 'completed', 
            jsonb_build_object('journal_entry_id', journal_entry_id, 'journal_entry_number', journal_entry_number), 
            now()
        );
    ELSE
        -- Log missing account mappings
        INSERT INTO public.contract_creation_log (
            contract_id, company_id, operation_step, status, error_message, metadata, created_at
        ) VALUES (
            new_contract_id, p_company_id, 'journal_entry_creation', 'skipped', 
            'Missing account mappings for journal entry creation',
            jsonb_build_object(
                'receivable_account_id', receivable_account_id, 
                'revenue_account_id', revenue_account_id
            ), 
            now()
        );
    END IF;
    
    -- Calculate execution time
    execution_time := EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000;
    
    -- Log successful completion
    INSERT INTO public.contract_creation_log (
        contract_id, company_id, operation_step, status, execution_time_ms, created_at
    ) VALUES (
        new_contract_id, p_company_id, 'completed', 'success', execution_time, now()
    );
    
    -- Build result
    result := jsonb_build_object(
        'success', true,
        'contract_id', new_contract_id,
        'contract_number', new_contract_number
    );
    
    -- Add journal entry info if created
    IF journal_entry_id IS NOT NULL THEN
        result := result || jsonb_build_object(
            'journal_entry_id', journal_entry_id,
            'journal_entry_number', journal_entry_number
        );
    ELSE
        result := result || jsonb_build_object(
            'requires_manual_entry', true,
            'warnings', ARRAY['Journal entry not created - missing account mappings']
        );
    END IF;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO public.contract_creation_log (
        contract_id, company_id, operation_step, status, error_message, execution_time_ms, created_at
    ) VALUES (
        new_contract_id, p_company_id, 'failed', 'error', 
        SQLERRM, 
        EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000, 
        now()
    );
    
    -- Return error response
    RETURN jsonb_build_object(
        'success', false,
        'error_code', SQLSTATE,
        'error_message', SQLERRM,
        'contract_id', new_contract_id,
        'contract_number', new_contract_number
    );
END;
$$;