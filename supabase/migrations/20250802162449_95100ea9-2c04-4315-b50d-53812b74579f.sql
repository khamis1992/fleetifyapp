-- Drop the old problematic version of create_contract_journal_entry function
-- This will remove the version with ambiguous user_id references
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, numeric, text, text);

-- Create the correct version of create_contract_journal_entry function
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
    contract_id_param uuid,
    company_id_param uuid,
    created_by_param uuid,
    contract_amount_param numeric,
    entry_description_param text DEFAULT 'Contract Journal Entry'::text,
    reference_param text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_entry_id uuid;
    receivables_account_id uuid;
    revenue_account_id uuid;
    contract_record record;
    entry_number text;
    cost_center_id uuid;
BEGIN
    -- Get contract details with explicit column references
    SELECT 
        c.id,
        c.contract_number,
        c.customer_id,
        c.vehicle_id,
        c.contract_type,
        c.cost_center_id as contract_cost_center_id,
        c.created_by
    INTO contract_record
    FROM public.contracts c
    WHERE c.id = contract_id_param 
    AND c.company_id = company_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found or does not belong to the specified company';
    END IF;
    
    -- Use contract's cost center or get customer's default
    cost_center_id := contract_record.contract_cost_center_id;
    IF cost_center_id IS NULL THEN
        cost_center_id := public.get_customer_default_cost_center(contract_record.customer_id);
    END IF;
    
    -- Get receivables account from account mappings
    SELECT cam.chart_of_accounts_id INTO receivables_account_id
    FROM public.account_mappings cam
    JOIN public.default_account_types dat ON cam.default_account_type_id = dat.id
    WHERE cam.company_id = company_id_param
    AND dat.type_code = 'RECEIVABLES'
    AND cam.is_active = true
    LIMIT 1;
    
    -- Get revenue account from account mappings
    SELECT cam.chart_of_accounts_id INTO revenue_account_id
    FROM public.account_mappings cam
    JOIN public.default_account_types dat ON cam.default_account_type_id = dat.id
    WHERE cam.company_id = company_id_param
    AND dat.type_code = 'RENTAL_REVENUE'
    AND cam.is_active = true
    LIMIT 1;
    
    -- Fallback to SALES_REVENUE if RENTAL_REVENUE not found
    IF revenue_account_id IS NULL THEN
        SELECT cam.chart_of_accounts_id INTO revenue_account_id
        FROM public.account_mappings cam
        JOIN public.default_account_types dat ON cam.default_account_type_id = dat.id
        WHERE cam.company_id = company_id_param
        AND dat.type_code = 'SALES_REVENUE'
        AND cam.is_active = true
        LIMIT 1;
    END IF;
    
    -- Validate that required accounts exist
    IF receivables_account_id IS NULL THEN
        RAISE EXCEPTION 'No receivables account mapping found for company';
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No revenue account mapping found for company';
    END IF;
    
    -- Generate journal entry number
    entry_number := 'JE-CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = company_id_param 
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference,
        total_amount,
        status,
        created_by,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        entry_number,
        CURRENT_DATE,
        entry_description_param || ' - ' || contract_record.contract_number,
        COALESCE(reference_param, contract_record.contract_number),
        contract_amount_param,
        'posted',
        created_by_param,
        cost_center_id
    ) RETURNING id INTO journal_entry_id;
    
    -- Create debit entry (Receivables)
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        receivables_account_id,
        contract_amount_param,
        0,
        'Contract receivable - ' || contract_record.contract_number
    );
    
    -- Create credit entry (Revenue)
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        0,
        contract_amount_param,
        'Contract revenue - ' || contract_record.contract_number
    );
    
    RAISE LOG 'Created journal entry % for contract %', journal_entry_id, contract_id_param;
    
    RETURN journal_entry_id;
END;
$function$;