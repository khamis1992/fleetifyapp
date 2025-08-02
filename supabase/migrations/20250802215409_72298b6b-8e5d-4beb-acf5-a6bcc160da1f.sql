-- Step 1: Drop the old create_contract_with_journal_entry function that accepts contract_data
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(jsonb);

-- Step 2: Drop the problematic create_contract_journal_entry_enhanced function  
DROP FUNCTION IF EXISTS public.create_contract_journal_entry_enhanced(uuid);

-- Step 3: Ensure we have the correct create_contract_with_journal_entry function with individual parameters
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    company_id_param uuid,
    customer_id_param uuid,
    vehicle_id_param uuid DEFAULT NULL,
    contract_number_param text DEFAULT NULL,
    contract_type_param text DEFAULT 'rental',
    contract_date_param date DEFAULT CURRENT_DATE,
    start_date_param date DEFAULT CURRENT_DATE,
    end_date_param date DEFAULT CURRENT_DATE + INTERVAL '30 days',
    contract_amount_param numeric DEFAULT 0,
    monthly_amount_param numeric DEFAULT 0,
    description_param text DEFAULT NULL,
    terms_param text DEFAULT NULL,
    cost_center_id_param uuid DEFAULT NULL,
    created_by_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_id uuid;
    journal_entry_id uuid;
    final_contract_number text;
    actual_created_by uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
    result jsonb;
BEGIN
    -- Set created_by to current user if not provided
    actual_created_by := COALESCE(created_by_param, auth.uid());
    
    -- Generate contract number if not provided
    IF contract_number_param IS NULL OR contract_number_param = '' THEN
        final_contract_number := generate_contract_number(company_id_param);
    ELSE
        final_contract_number := contract_number_param;
    END IF;
    
    -- Create the contract
    INSERT INTO public.contracts (
        id,
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_type,
        contract_date,
        start_date,
        end_date,
        contract_amount,
        monthly_amount,
        description,
        terms,
        status,
        cost_center_id,
        created_by
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        customer_id_param,
        vehicle_id_param,
        final_contract_number,
        contract_type_param,
        contract_date_param,
        start_date_param,
        end_date_param,
        contract_amount_param,
        monthly_amount_param,
        description_param,
        terms_param,
        'draft',
        cost_center_id_param,
        actual_created_by
    ) RETURNING id INTO contract_id;
    
    -- Create journal entry inline to avoid transaction isolation issues
    IF contract_amount_param > 0 THEN
        -- Get account mappings
        receivable_account_id := public.get_mapped_account_enhanced(company_id_param, 'RECEIVABLES');
        revenue_account_id := public.get_mapped_account_enhanced(company_id_param, 'RENTAL_REVENUE');
        
        -- Get sales cost center
        SELECT id INTO sales_cost_center_id
        FROM public.cost_centers
        WHERE company_id = company_id_param
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
        
        -- Create journal entry if we have the required accounts
        IF receivable_account_id IS NOT NULL AND revenue_account_id IS NOT NULL THEN
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
                company_id_param,
                generate_journal_entry_number(company_id_param),
                contract_date_param,
                'Contract Revenue Recognition - ' || final_contract_number,
                'contract',
                contract_id,
                contract_amount_param,
                contract_amount_param,
                'draft',
                actual_created_by
            ) RETURNING id INTO journal_entry_id;
            
            -- Create journal entry lines
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
                'Accounts Receivable - Contract ' || final_contract_number,
                contract_amount_param,
                0
            );
            
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
                'Revenue - Contract ' || final_contract_number,
                0,
                contract_amount_param
            );
            
            -- Update contract with journal entry reference
            UPDATE public.contracts 
            SET journal_entry_id = journal_entry_id
            WHERE id = contract_id;
        END IF;
    END IF;
    
    -- Update vehicle status if vehicle is assigned
    IF vehicle_id_param IS NOT NULL THEN
        UPDATE public.vehicles 
        SET status = 'rented'
        WHERE id = vehicle_id_param;
    END IF;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'contract_number', final_contract_number,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', CASE WHEN journal_entry_id IS NOT NULL THEN 
            (SELECT entry_number FROM public.journal_entries WHERE id = journal_entry_id)
            ELSE NULL END
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$function$;

-- Step 4: Create the generate_contract_number function if it doesn't exist
CREATE OR REPLACE FUNCTION public.generate_contract_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing contracts for this company in current year
    SELECT COUNT(*) + 1 INTO contract_count
    FROM public.contracts 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted contract number
    RETURN 'CNT-' || year_suffix || '-' || LPAD(contract_count::TEXT, 4, '0');
END;
$function$;

-- Step 5: Create the generate_journal_entry_number function if it doesn't exist
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
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing journal entries for this company in current year
    SELECT COUNT(*) + 1 INTO entry_count
    FROM public.journal_entries 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted journal entry number
    RETURN 'JE-' || year_suffix || '-' || LPAD(entry_count::TEXT, 4, '0');
END;
$function$;