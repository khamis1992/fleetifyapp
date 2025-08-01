-- Drop the existing function first to avoid parameter name conflict
DROP FUNCTION IF EXISTS public.get_mapped_account_id(uuid, text);

-- Phase 1: Create improved account mapping retrieval function
CREATE OR REPLACE FUNCTION public.get_mapped_account_id(company_id_param uuid, account_type_param text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_id UUID;
    default_account_type_id UUID;
BEGIN
    -- First try to get account from existing account mappings
    SELECT 
        am.chart_of_accounts_id
    INTO account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param 
    AND dat.type_code = account_type_param
    AND am.is_active = true
    LIMIT 1;
    
    -- If found, return it
    IF account_id IS NOT NULL THEN
        RETURN account_id;
    END IF;
    
    -- If not found, try to find a suitable account by searching chart of accounts
    CASE account_type_param
        WHEN 'RECEIVABLES' THEN
            SELECT id INTO account_id
            FROM public.chart_of_accounts
            WHERE company_id = company_id_param
            AND account_type = 'assets'
            AND (account_name ILIKE '%receivable%' 
                 OR account_name ILIKE '%مدين%' 
                 OR account_name ILIKE '%ذمم%'
                 OR account_code LIKE '112%')
            AND is_active = true
            AND is_header = false
            ORDER BY account_code
            LIMIT 1;
            
        WHEN 'SALES_REVENUE' THEN
            SELECT id INTO account_id
            FROM public.chart_of_accounts
            WHERE company_id = company_id_param
            AND account_type = 'revenue'
            AND (account_name ILIKE '%sales%' 
                 OR account_name ILIKE '%revenue%'
                 OR account_name ILIKE '%مبيعات%'
                 OR account_name ILIKE '%إيرادات%'
                 OR account_code LIKE '4%')
            AND is_active = true
            AND is_header = false
            ORDER BY account_code
            LIMIT 1;
            
        WHEN 'RENTAL_REVENUE' THEN
            SELECT id INTO account_id
            FROM public.chart_of_accounts
            WHERE company_id = company_id_param
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
            
        WHEN 'CASH' THEN
            SELECT id INTO account_id
            FROM public.chart_of_accounts
            WHERE company_id = company_id_param
            AND account_type = 'assets'
            AND (account_name ILIKE '%cash%' 
                 OR account_name ILIKE '%نقد%'
                 OR account_code LIKE '11%')
            AND is_active = true
            AND is_header = false
            ORDER BY account_code
            LIMIT 1;
    END CASE;
    
    -- Log the search attempt
    RAISE LOG 'Account mapping search for company % and type %: %', 
        company_id_param, account_type_param, 
        CASE WHEN account_id IS NOT NULL THEN 'Found' ELSE 'Not Found' END;
    
    RETURN account_id;
END;
$function$;

-- Phase 2: Improve contract journal entry creation with better error handling
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
    missing_accounts text[] := ARRAY[]::text[];
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract with ID % not found', contract_id_param
            USING ERRCODE = 'no_data_found';
    END IF;
    
    -- Check if journal entry already exists
    IF contract_record.journal_entry_id IS NOT NULL THEN
        RETURN contract_record.journal_entry_id;
    END IF;
    
    -- Get cost center
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get required accounts with improved mapping
    receivable_account_id := public.get_mapped_account_id(contract_record.company_id, 'RECEIVABLES');
    
    -- Try rental revenue first, then sales revenue
    revenue_account_id := public.get_mapped_account_id(contract_record.company_id, 'RENTAL_REVENUE');
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_id(contract_record.company_id, 'SALES_REVENUE');
    END IF;
    
    -- Check for missing accounts and collect them
    IF receivable_account_id IS NULL THEN
        missing_accounts := array_append(missing_accounts, 'RECEIVABLES');
    END IF;
    
    IF revenue_account_id IS NULL THEN
        missing_accounts := array_append(missing_accounts, 'REVENUE');
    END IF;
    
    -- If any accounts are missing, provide detailed error
    IF array_length(missing_accounts, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required account mappings for contract journal entry: %. Please configure account mappings for company % or create the required accounts in the chart of accounts.',
            array_to_string(missing_accounts, ', '), contract_record.company_id
            USING ERRCODE = 'configuration_error',
                  HINT = 'Navigate to Finance > Account Mappings to configure the missing account types';
    END IF;
    
    -- Generate journal entry number
    SELECT 
        'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
        LPAD((COUNT(*) + 1)::TEXT, 4, '0')
    INTO entry_number
    FROM public.journal_entries 
    WHERE company_id = contract_record.company_id 
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
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
        'Contract Revenue Recognition - #' || contract_record.contract_number,
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'posted',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create debit entry (Accounts Receivable)
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
        'Contract Receivable - ' || contract_record.contract_number,
        contract_record.contract_amount,
        0
    );
    
    -- Create credit entry (Revenue)
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
    
    -- Update contract with journal entry reference
    UPDATE public.contracts 
    SET journal_entry_id = journal_entry_id,
        updated_at = now()
    WHERE id = contract_id_param;
    
    -- Log successful creation
    RAISE LOG 'Successfully created journal entry % for contract %', 
        journal_entry_id, contract_id_param;
    
    RETURN journal_entry_id;
END;
$function$;