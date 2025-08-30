-- Fix ambiguous column references in create_contract_journal_entry function
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
    contract_id_param uuid,
    user_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    journal_entry_id uuid;
    journal_entry_number text;
    user_company_id uuid;
    receivables_account_id uuid;
    revenue_account_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user ID if not provided
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Get user's company ID with explicit column qualification
    SELECT profiles.company_id INTO user_company_id
    FROM public.profiles 
    WHERE profiles.id = current_user_id 
    LIMIT 1;
    
    IF user_company_id IS NULL THEN
        RAISE EXCEPTION 'User company not found';
    END IF;
    
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param
    AND status IN ('active', 'draft');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found or not in valid status';
    END IF;
    
    -- Verify contract belongs to user's company
    IF contract_record.company_id != user_company_id THEN
        RAISE EXCEPTION 'Contract does not belong to user company';
    END IF;
    
    -- Get account mappings for the contract type
    SELECT am.chart_of_accounts_id INTO receivables_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = user_company_id
    AND dat.type_code = 'RECEIVABLES'
    AND am.is_active = true
    LIMIT 1;
    
    SELECT am.chart_of_accounts_id INTO revenue_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = user_company_id
    AND dat.type_code = CASE 
        WHEN contract_record.contract_type = 'rental' THEN 'RENTAL_REVENUE'
        ELSE 'SALES_REVENUE'
    END
    AND am.is_active = true
    LIMIT 1;
    
    -- Check if accounts are found
    IF receivables_account_id IS NULL THEN
        RAISE EXCEPTION 'Receivables account mapping not found for company';
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'Revenue account mapping not found for company and contract type';
    END IF;
    
    -- Generate journal entry number
    journal_entry_number := 'JE-CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = user_company_id 
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        created_by,
        status
    ) VALUES (
        user_company_id,
        journal_entry_number,
        contract_record.contract_date,
        'Contract Journal Entry - ' || contract_record.contract_number,
        'contract',
        contract_record.id,
        current_user_id,
        'posted'
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Receivables
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        cost_center_id
    ) VALUES (
        journal_entry_id,
        receivables_account_id,
        contract_record.contract_amount,
        0,
        'Contract Receivable - ' || contract_record.contract_number,
        contract_record.cost_center_id
    );
    
    -- Credit: Revenue
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        cost_center_id
    ) VALUES (
        journal_entry_id,
        revenue_account_id,
        0,
        contract_record.contract_amount,
        'Contract Revenue - ' || contract_record.contract_number,
        contract_record.cost_center_id
    );
    
    -- Update contract with journal entry reference
    UPDATE public.contracts
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    RETURN journal_entry_id;
END;
$function$;