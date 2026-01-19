-- Final fix for contract creation with journal entry
-- This creates a single, unified function that handles all contract creation scenarios

-- Step 1: Clean up all existing conflicting functions
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_journal_entry CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_journal_entry_enhanced CASCADE;

-- Step 2: Create essential account lookup function
CREATE OR REPLACE FUNCTION public.get_or_create_essential_account(
    company_id_param uuid,
    account_type_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id uuid;
    account_code text;
    account_name text;
    account_type_val text;
    balance_type_val text;
BEGIN
    -- First try to find existing account
    CASE account_type_param
        WHEN 'RECEIVABLES' THEN
            SELECT id INTO account_id
            FROM public.chart_of_accounts
            WHERE company_id = company_id_param
            AND account_type = 'assets'
            AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
            AND is_active = true
            AND is_header = false
            LIMIT 1;
            
        WHEN 'REVENUE' THEN
            SELECT id INTO account_id
            FROM public.chart_of_accounts
            WHERE company_id = company_id_param
            AND account_type = 'revenue'
            AND is_active = true
            AND is_header = false
            LIMIT 1;
    END CASE;
    
    -- If not found, create it
    IF account_id IS NULL THEN
        CASE account_type_param
            WHEN 'RECEIVABLES' THEN
                account_code := '1201';
                account_name := 'ذمم العملاء';
                account_type_val := 'assets';
                balance_type_val := 'debit';
                
            WHEN 'REVENUE' THEN
                account_code := '4101';
                account_name := 'إيرادات تأجير المركبات';
                account_type_val := 'revenue';
                balance_type_val := 'credit';
        END CASE;
        
        INSERT INTO public.chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_type,
            balance_type,
            is_active,
            is_header,
            account_level
        ) VALUES (
            company_id_param,
            account_code,
            account_name,
            account_type_val,
            balance_type_val,
            true,
            false,
            2
        ) RETURNING id INTO account_id;
    END IF;
    
    RETURN account_id;
END;
$$;

-- Step 3: Create unified contract creation function
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
    p_company_id uuid,
    p_customer_id uuid,
    p_vehicle_id uuid DEFAULT NULL,
    p_contract_type text DEFAULT 'rental',
    p_start_date date DEFAULT CURRENT_DATE,
    p_end_date date DEFAULT CURRENT_DATE + INTERVAL '30 days',
    p_contract_amount numeric DEFAULT 0,
    p_monthly_amount numeric DEFAULT 0,
    p_description text DEFAULT NULL,
    p_terms text DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL,
    p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_contract_id uuid;
    v_contract_number text;
    v_journal_entry_id uuid;
    v_journal_entry_number text;
    v_receivable_account_id uuid;
    v_revenue_account_id uuid;
    v_result jsonb;
    v_warnings text[] := '{}';
    v_requires_manual_entry boolean := false;
BEGIN
    -- Validate required parameters
    IF p_company_id IS NULL OR p_customer_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Company ID and Customer ID are required'
        );
    END IF;
    
    -- Generate contract number
    SELECT 'CNT-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.contracts 
        WHERE company_id = p_company_id 
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0') INTO v_contract_number;
    
    -- Create the contract first
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
        p_company_id,
        p_customer_id,
        p_vehicle_id,
        v_contract_number,
        p_contract_type,
        CURRENT_DATE,
        p_start_date,
        p_end_date,
        p_contract_amount,
        p_monthly_amount,
        p_description,
        p_terms,
        'draft',
        p_cost_center_id,
        p_created_by
    ) RETURNING id INTO v_contract_id;
    
    -- Try to create journal entry if amount > 0
    IF p_contract_amount > 0 THEN
        BEGIN
            -- Get or create essential accounts
            v_receivable_account_id := public.get_or_create_essential_account(p_company_id, 'RECEIVABLES');
            v_revenue_account_id := public.get_or_create_essential_account(p_company_id, 'REVENUE');
            
            -- Generate journal entry number
            SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.journal_entries 
                WHERE company_id = p_company_id 
                AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
            )::TEXT, 4, '0') INTO v_journal_entry_number;
            
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
                p_company_id,
                v_journal_entry_number,
                CURRENT_DATE,
                'Contract Revenue - ' || v_contract_number,
                'contract',
                v_contract_id,
                p_contract_amount,
                p_contract_amount,
                'posted',
                p_created_by
            ) RETURNING id INTO v_journal_entry_id;
            
            -- Create journal entry lines
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES 
            (
                gen_random_uuid(),
                v_journal_entry_id,
                v_receivable_account_id,
                1,
                'Accounts Receivable - ' || v_contract_number,
                p_contract_amount,
                0
            ),
            (
                gen_random_uuid(),
                v_journal_entry_id,
                v_revenue_account_id,
                2,
                'Contract Revenue - ' || v_contract_number,
                0,
                p_contract_amount
            );
            
            -- Update contract status to active
            UPDATE public.contracts 
            SET status = 'active', journal_entry_id = v_journal_entry_id
            WHERE id = v_contract_id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Journal entry failed, but contract was created
            v_requires_manual_entry := true;
            v_warnings := array_append(v_warnings, 'Journal entry creation failed: ' || SQLERRM);
        END;
    END IF;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number,
        'requires_manual_entry', v_requires_manual_entry
    );
    
    IF v_journal_entry_id IS NOT NULL THEN
        v_result := v_result || jsonb_build_object(
            'journal_entry_id', v_journal_entry_id,
            'journal_entry_number', v_journal_entry_number
        );
    END IF;
    
    IF array_length(v_warnings, 1) > 0 THEN
        v_result := v_result || jsonb_build_object('warnings', to_jsonb(v_warnings));
    END IF;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Clean up contract if it was created
    IF v_contract_id IS NOT NULL THEN
        DELETE FROM public.contracts WHERE id = v_contract_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_contract_with_journal_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_essential_account TO authenticated;