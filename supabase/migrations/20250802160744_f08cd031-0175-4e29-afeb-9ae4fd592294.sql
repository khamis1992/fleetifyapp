-- Drop the existing problematic function to avoid ambiguity
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, uuid);

-- Recreate the function with proper table aliases to fix ambiguous user_id references
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
    contract_id_param uuid, 
    company_id_param uuid, 
    created_by_user_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    journal_entry_id uuid;
    entry_number text;
    revenue_account_id uuid;
    receivable_account_id uuid;
    current_user_id uuid;
BEGIN
    -- Get the user ID, prioritizing the parameter over auth.uid()
    current_user_id := COALESCE(created_by_user_id, auth.uid());
    
    -- Validate inputs
    IF contract_id_param IS NULL THEN
        RAISE EXCEPTION 'Contract ID cannot be null';
    END IF;
    
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID cannot be null';
    END IF;
    
    -- Get contract details with explicit table aliases to avoid ambiguity
    SELECT 
        c.id,
        c.contract_number,
        c.contract_amount,
        c.monthly_amount,
        c.contract_type,
        c.customer_id,
        c.cost_center_id,
        c.created_by,
        c.company_id
    INTO contract_record
    FROM public.contracts c
    WHERE c.id = contract_id_param
    AND c.company_id = company_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', contract_id_param;
    END IF;
    
    -- Get revenue account from mappings
    SELECT am.chart_of_accounts_id INTO revenue_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = 'RENTAL_REVENUE'
    AND am.is_active = true
    LIMIT 1;
    
    -- Fallback to find any revenue account
    IF revenue_account_id IS NULL THEN
        SELECT coa.id INTO revenue_account_id
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.account_type = 'revenue'
        AND coa.is_active = true
        AND coa.is_header = false
        ORDER BY coa.account_code
        LIMIT 1;
    END IF;
    
    -- Get receivable account from customer account or mappings
    SELECT ca.account_id INTO receivable_account_id
    FROM public.customer_accounts ca
    WHERE ca.customer_id = contract_record.customer_id
    AND ca.company_id = company_id_param
    LIMIT 1;
    
    -- Fallback to get receivable account from mappings
    IF receivable_account_id IS NULL THEN
        SELECT am.chart_of_accounts_id INTO receivable_account_id
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param
        AND dat.type_code = 'RECEIVABLES'
        AND am.is_active = true
        LIMIT 1;
    END IF;
    
    -- Validate we have the required accounts
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No revenue account found for company';
    END IF;
    
    IF receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No receivable account found for customer or company';
    END IF;
    
    -- Generate entry number
    entry_number := 'CNT-JE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries je
        WHERE je.company_id = company_id_param 
        AND EXTRACT(YEAR FROM je.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
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
        company_id_param,
        entry_number,
        CURRENT_DATE,
        'Contract revenue recognition for ' || contract_record.contract_number,
        'contract',
        contract_id_param,
        'posted',
        current_user_id
    ) RETURNING id INTO journal_entry_id;
    
    -- Create debit entry (Accounts Receivable)
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        receivable_account_id,
        'Contract receivable - ' || contract_record.contract_number,
        contract_record.contract_amount,
        0,
        contract_record.cost_center_id
    );
    
    -- Create credit entry (Revenue)
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        'Contract revenue - ' || contract_record.contract_number,
        0,
        contract_record.contract_amount,
        contract_record.cost_center_id
    );
    
    -- Update contract with journal entry reference
    UPDATE public.contracts 
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise with context
        RAISE EXCEPTION 'Failed to create contract journal entry for contract %: %', contract_id_param, SQLERRM;
END;
$function$;