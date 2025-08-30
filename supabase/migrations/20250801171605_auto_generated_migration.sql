-- Fix the log_contract_creation_step function to handle missing meta parameter gracefully
CREATE OR REPLACE FUNCTION public.log_contract_creation_step(
    company_id_param uuid, 
    contract_id_param uuid, 
    step_name text, 
    status_param text, 
    attempt_num integer DEFAULT 1, 
    error_msg text DEFAULT NULL::text, 
    exec_time integer DEFAULT NULL::integer, 
    meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate inputs
    IF company_id_param IS NULL THEN
        RAISE WARNING 'company_id_param cannot be null for logging';
        RETURN;
    END IF;
    
    IF step_name IS NULL OR step_name = '' THEN
        RAISE WARNING 'step_name cannot be null or empty for logging';
        RETURN;
    END IF;
    
    IF status_param IS NULL OR status_param = '' THEN
        RAISE WARNING 'status_param cannot be null or empty for logging';
        RETURN;
    END IF;

    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,
        status,
        attempt_number,
        error_message,
        execution_time_ms,
        metadata
    ) VALUES (
        company_id_param,
        contract_id_param,
        step_name,
        status_param,
        COALESCE(attempt_num, 1),
        error_msg,
        exec_time,
        COALESCE(meta, '{}'::jsonb)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the actual error but don't let logging failures affect main operations
        RAISE WARNING 'Failed to log contract creation step for step "%" with status "%": %', 
            step_name, status_param, SQLERRM;
END;
$function$;

-- Create a trigger to automatically create journal entries when contracts are activated
CREATE OR REPLACE FUNCTION public.handle_contract_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_entry_id uuid;
BEGIN
    -- Only create journal entry when status changes from draft to active
    IF OLD.status != 'active' AND NEW.status = 'active' AND NEW.journal_entry_id IS NULL THEN
        BEGIN
            -- Call the journal entry creation function
            journal_entry_id := public.create_contract_journal_entry(NEW.id);
            
            -- Update the contract with the journal entry ID
            NEW.journal_entry_id := journal_entry_id;
            
            -- Log success
            PERFORM public.log_contract_creation_step(
                NEW.company_id,
                NEW.id,
                'journal_entry_creation',
                'completed',
                1,
                NULL,
                NULL,
                jsonb_build_object('journal_entry_id', journal_entry_id)
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the contract activation
                PERFORM public.log_contract_creation_step(
                    NEW.company_id,
                    NEW.id,
                    'journal_entry_creation',
                    'failed',
                    1,
                    SQLERRM,
                    NULL,
                    jsonb_build_object('error_code', SQLSTATE)
                );
                
                -- Still allow the contract to be activated even if journal entry fails
                RAISE WARNING 'Failed to create journal entry for contract %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_contract_activation ON public.contracts;
CREATE TRIGGER trigger_contract_activation
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_contract_activation();

-- Improve the create_contract_journal_entry function with better error handling
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
    entry_number text;
BEGIN
    -- Get contract data with better error handling
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract with ID % not found', contract_id_param;
    END IF;
    
    -- Get sales cost center (optional)
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get receivable account (required)
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_name ILIKE '%ذمم%')
    AND is_active = true
    AND is_header = false
    ORDER BY account_level DESC
    LIMIT 1;
    
    IF receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No suitable receivable account found for company %', contract_record.company_id;
    END IF;
    
    -- Get revenue account (required)
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'revenue'
    AND (account_name ILIKE '%rental%' OR account_name ILIKE '%sales%' OR account_name ILIKE '%إيجار%' OR account_name ILIKE '%مبيعات%')
    AND is_active = true
    AND is_header = false
    ORDER BY account_level DESC
    LIMIT 1;
    
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No suitable revenue account found for company %', contract_record.company_id;
    END IF;
    
    -- Generate entry number
    entry_number := 'CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = contract_record.company_id 
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
        contract_record.company_id,
        entry_number,
        contract_record.contract_date,
        'Contract Entry - ' || contract_record.contract_number,
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'posted',
        COALESCE(contract_record.created_by, auth.uid())
    ) RETURNING id INTO journal_entry_id;
    
    -- Add receivable line
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
        receivable_account_id,
        sales_cost_center_id,
        1,
        'Accounts Receivable - Contract #' || contract_record.contract_number,
        contract_record.contract_amount,
        0
    );
    
    -- Add revenue line
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
        sales_cost_center_id,
        2,
        'Contract Revenue - ' || contract_record.contract_number,
        0,
        contract_record.contract_amount
    );
    
    RETURN journal_entry_id;
END;
$function$;