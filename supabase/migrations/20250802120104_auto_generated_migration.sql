-- Clean up erroneous contract creation logs that reference non-existent contracts
-- and improve the contract journal entry processing

-- First, let's clean up logs for contracts that don't exist
DELETE FROM public.contract_creation_log
WHERE contract_id NOT IN (
    SELECT id FROM public.contracts
)
AND operation_step = 'journal_entry_creation'
AND status = 'failed';

-- Add a function to validate contract existence before processing
CREATE OR REPLACE FUNCTION public.validate_contract_exists(contract_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.contracts 
        WHERE id = contract_id_param
    );
END;
$$;

-- Add a function to clean up orphaned logs
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_contract_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete logs for contracts that no longer exist
    DELETE FROM public.contract_creation_log
    WHERE contract_id NOT IN (
        SELECT id FROM public.contracts
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO public.system_logs (
        company_id,
        category,
        action,
        message,
        level,
        user_id
    ) VALUES (
        NULL, -- System operation
        'maintenance',
        'cleanup_orphaned_logs',
        'Cleaned up ' || deleted_count || ' orphaned contract logs',
        'info',
        NULL
    );
    
    RETURN deleted_count;
END;
$$;

-- Improve the contract journal entry creation function to be more robust
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_record RECORD;
    journal_entry_id uuid;
    customer_account_id uuid;
    revenue_account_id uuid;
    entry_number text;
    current_user_id uuid;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Validate contract exists first
    IF NOT public.validate_contract_exists(contract_id_param) THEN
        RAISE EXCEPTION 'Contract with ID % does not exist', contract_id_param
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    
    -- Get contract details with all required information
    SELECT 
        c.*,
        cust.company_name,
        cust.first_name,
        cust.last_name,
        cust.customer_type
    INTO contract_record
    FROM public.contracts c
    LEFT JOIN public.customers cust ON c.customer_id = cust.id
    WHERE c.id = contract_id_param
    AND c.status = 'active'
    AND c.journal_entry_id IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract % is not eligible for journal entry creation (not active or already has journal entry)', contract_id_param
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    
    -- Get customer account
    SELECT ca.account_id INTO customer_account_id
    FROM public.customer_accounts ca
    WHERE ca.customer_id = contract_record.customer_id
    AND ca.company_id = contract_record.company_id
    LIMIT 1;
    
    -- If no customer account exists, try to create one
    IF customer_account_id IS NULL THEN
        customer_account_id := public.create_customer_financial_account(
            contract_record.customer_id,
            contract_record.company_id,
            jsonb_build_object(
                'customer_type', contract_record.customer_type,
                'first_name', contract_record.first_name,
                'last_name', contract_record.last_name,
                'company_name', contract_record.company_name
            )
        );
        
        IF customer_account_id IS NULL THEN
            RAISE EXCEPTION 'Failed to create or find customer account for contract %', contract_id_param
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;
    
    -- Get revenue account from account mappings
    SELECT am.chart_of_accounts_id INTO revenue_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = contract_record.company_id
    AND dat.type_code = 'RENTAL_REVENUE'
    AND am.is_active = true
    LIMIT 1;
    
    -- If no revenue account mapping, try to find a suitable revenue account
    IF revenue_account_id IS NULL THEN
        SELECT id INTO revenue_account_id
        FROM public.chart_of_accounts
        WHERE company_id = contract_record.company_id
        AND account_type = 'revenue'
        AND (account_name ILIKE '%rental%' 
             OR account_name ILIKE '%rent%'
             OR account_name ILIKE '%إيجار%'
             OR account_name ILIKE '%تأجير%'
             OR account_code LIKE '41%')
        AND is_active = true
        AND is_header = false
        ORDER BY account_code
        LIMIT 1;
        
        IF revenue_account_id IS NULL THEN
            RAISE EXCEPTION 'No suitable revenue account found for contract %', contract_id_param
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;
    
    -- Generate journal entry number
    entry_number := 'JE-CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
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
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        contract_record.company_id,
        entry_number,
        CURRENT_DATE,
        'Contract activation - ' || contract_record.contract_number,
        'contract',
        contract_record.id,
        'posted',
        COALESCE(current_user_id, contract_record.created_by)
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES 
    (
        gen_random_uuid(),
        journal_entry_id,
        customer_account_id,
        'Contract receivable - ' || contract_record.contract_number,
        contract_record.contract_amount,
        0
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        'Contract revenue - ' || contract_record.contract_number,
        0,
        contract_record.contract_amount
    );
    
    -- Update contract with journal entry reference
    UPDATE public.contracts
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    RETURN journal_entry_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        INSERT INTO public.contract_creation_log (
            company_id,
            contract_id,
            operation_step,
            status,
            error_message,
            metadata
        ) VALUES (
            contract_record.company_id,
            contract_id_param,
            'journal_entry_creation',
            'function_error',
            SQLERRM,
            jsonb_build_object(
                'error_code', SQLSTATE,
                'function_name', 'create_contract_journal_entry'
            )
        );
        
        RAISE;
END;
$$;