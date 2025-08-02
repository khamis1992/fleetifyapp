-- Fix the create_contract_journal_entry function to handle missing contracts properly
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
    contract_id_param uuid,
    entry_type_param text DEFAULT 'accrual'::text,
    amount_param numeric DEFAULT NULL::numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    journal_entry_id uuid;
    entry_description text;
    entry_amount numeric;
    revenue_account_id uuid;
    receivable_account_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Get contract details and validate existence
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    -- Check if contract exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract with ID % not found', contract_id_param
            USING ERRCODE = 'no_data_found';
    END IF;
    
    -- Validate contract status
    IF contract_record.status NOT IN ('active', 'draft') THEN
        RAISE EXCEPTION 'Cannot create journal entry for contract with status: %', contract_record.status
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    
    -- Determine entry amount
    IF amount_param IS NOT NULL THEN
        entry_amount := amount_param;
    ELSE
        CASE entry_type_param
            WHEN 'accrual' THEN entry_amount := contract_record.contract_amount;
            WHEN 'installment' THEN entry_amount := contract_record.monthly_amount;
            WHEN 'cancellation' THEN entry_amount := contract_record.contract_amount * -1;
            ELSE entry_amount := contract_record.contract_amount;
        END CASE;
    END IF;
    
    -- Validate amount
    IF entry_amount IS NULL OR entry_amount = 0 THEN
        RAISE EXCEPTION 'Invalid journal entry amount: %', entry_amount
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    
    -- Get revenue account (rental revenue or sales revenue)
    SELECT 
        COALESCE(
            (SELECT chart_of_accounts_id FROM public.account_mappings am 
             JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
             WHERE am.company_id = contract_record.company_id 
             AND dat.type_code = 'RENTAL_REVENUE' 
             AND am.is_active = true LIMIT 1),
            (SELECT chart_of_accounts_id FROM public.account_mappings am 
             JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
             WHERE am.company_id = contract_record.company_id 
             AND dat.type_code = 'SALES_REVENUE' 
             AND am.is_active = true LIMIT 1)
        ) INTO revenue_account_id;
    
    -- Get receivables account
    SELECT 
        COALESCE(
            (SELECT chart_of_accounts_id FROM public.account_mappings am 
             JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
             WHERE am.company_id = contract_record.company_id 
             AND dat.type_code = 'RECEIVABLES' 
             AND am.is_active = true LIMIT 1),
            contract_record.account_id
        ) INTO receivable_account_id;
    
    -- Validate accounts exist
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No revenue account mapping found for company'
            USING ERRCODE = 'configuration_error';
    END IF;
    
    IF receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No receivables account found for contract'
            USING ERRCODE = 'configuration_error';
    END IF;
    
    -- Create entry description
    CASE entry_type_param
        WHEN 'accrual' THEN 
            entry_description := 'Contract Revenue Accrual - ' || contract_record.contract_number;
        WHEN 'installment' THEN 
            entry_description := 'Contract Installment - ' || contract_record.contract_number;
        WHEN 'cancellation' THEN 
            entry_description := 'Contract Cancellation Reversal - ' || contract_record.contract_number;
        ELSE 
            entry_description := 'Contract Journal Entry - ' || contract_record.contract_number;
    END CASE;
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        reference_number,
        created_by,
        cost_center_id,
        status
    ) VALUES (
        contract_record.company_id,
        'JE-CONTRACT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = contract_record.company_id 
            AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 4, '0'),
        CURRENT_DATE,
        entry_description,
        contract_record.contract_number,
        COALESCE(current_user_id, contract_record.created_by),
        contract_record.cost_center_id,
        'posted'
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    IF entry_amount > 0 THEN
        -- Debit: Accounts Receivable
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description
        ) VALUES (
            journal_entry_id,
            receivable_account_id,
            ABS(entry_amount),
            0,
            'Receivable for ' || entry_description
        );
        
        -- Credit: Revenue
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description
        ) VALUES (
            journal_entry_id,
            revenue_account_id,
            0,
            ABS(entry_amount),
            'Revenue for ' || entry_description
        );
    ELSE
        -- Reversal entries for cancellation
        -- Credit: Accounts Receivable
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description
        ) VALUES (
            journal_entry_id,
            receivable_account_id,
            0,
            ABS(entry_amount),
            'Receivable reversal for ' || entry_description
        );
        
        -- Debit: Revenue
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description
        ) VALUES (
            journal_entry_id,
            revenue_account_id,
            ABS(entry_amount),
            0,
            'Revenue reversal for ' || entry_description
        );
    END IF;
    
    -- Update contract with journal entry reference
    UPDATE public.contracts 
    SET journal_entry_id = journal_entry_id,
        updated_at = now()
    WHERE id = contract_id_param;
    
    -- Log successful creation
    RAISE LOG 'Created journal entry % for contract %', journal_entry_id, contract_id_param;
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Error creating journal entry for contract %: %', contract_id_param, SQLERRM;
        -- Re-raise the exception
        RAISE;
END;
$function$;