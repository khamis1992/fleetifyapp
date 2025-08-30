-- ==========================================
-- COMPREHENSIVE DATABASE FUNCTIONS CLEANUP
-- ==========================================

-- 1. DROP ALL EXISTING OVERLOADED VERSIONS
-- ==========================================

-- Drop create_contract_journal_entry overloads
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_journal_entry_enhanced(uuid, uuid) CASCADE;

-- Drop create_customer_financial_account overloads
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid) CASCADE;

-- Drop create_payment_journal_entry overloads
DROP FUNCTION IF EXISTS public.create_payment_journal_entry(uuid, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_payment_journal_entry(uuid, numeric) CASCADE;

-- Drop get_mapped_account_id overloads
DROP FUNCTION IF EXISTS public.get_mapped_account_id(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_mapped_account_id(text) CASCADE;

-- 2. CREATE UNIFIED AND ENHANCED VERSIONS
-- ==========================================

-- Enhanced create_contract_journal_entry function
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry_enhanced(
    contract_id_param uuid,
    user_id_param uuid DEFAULT NULL::uuid,
    entry_type_param text DEFAULT 'contract_creation'::text,
    amount_param numeric DEFAULT NULL::numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    journal_entry_id UUID;
    receivables_account_id UUID;
    revenue_account_id UUID;
    entry_amount NUMERIC;
    entry_description TEXT;
    voucher_number TEXT;
    current_user_id UUID;
    result jsonb;
BEGIN
    -- Get current user
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Validate contract exists
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_NOT_FOUND',
            'error_message', 'Contract not found',
            'contract_id', contract_id_param
        );
    END IF;
    
    -- Validate user access
    IF NOT EXISTS(
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = current_user_id 
        AND p.company_id = contract_record.company_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACCESS_DENIED',
            'error_message', 'Access denied to contract company'
        );
    END IF;
    
    -- Determine amount
    IF amount_param IS NOT NULL THEN
        entry_amount := amount_param;
    ELSE
        CASE entry_type_param
            WHEN 'contract_creation', 'contract_activation' THEN
                entry_amount := contract_record.contract_amount;
            WHEN 'monthly_billing' THEN
                entry_amount := contract_record.monthly_amount;
            ELSE
                entry_amount := contract_record.contract_amount;
        END CASE;
    END IF;
    
    -- Skip if amount is zero
    IF entry_amount IS NULL OR entry_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_AMOUNT',
            'error_message', 'Amount is zero or invalid',
            'amount', entry_amount
        );
    END IF;
    
    -- Get account mappings
    receivables_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'RENTAL_REVENUE');
    
    -- Fallback to sales revenue
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_enhanced(contract_record.company_id, 'SALES_REVENUE');
    END IF;
    
    -- Validate accounts
    IF receivables_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'RECEIVABLES_ACCOUNT_NOT_FOUND',
            'error_message', 'No receivables account mapping found'
        );
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'REVENUE_ACCOUNT_NOT_FOUND',
            'error_message', 'No revenue account mapping found'
        );
    END IF;
    
    -- Generate description and voucher
    entry_description := CASE entry_type_param
        WHEN 'contract_creation' THEN 'Contract Creation - ' || contract_record.contract_number
        WHEN 'contract_activation' THEN 'Contract Activation - ' || contract_record.contract_number
        WHEN 'monthly_billing' THEN 'Monthly Billing - ' || contract_record.contract_number
        ELSE 'Contract Entry - ' || contract_record.contract_number
    END;
    
    voucher_number := 'CNT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
        LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = contract_record.company_id 
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id, company_id, entry_date, description, reference_number,
        total_amount, status, created_by, cost_center_id
    ) VALUES (
        gen_random_uuid(),
        contract_record.company_id,
        CURRENT_DATE,
        entry_description,
        voucher_number,
        entry_amount,
        'posted',
        current_user_id,
        contract_record.cost_center_id
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, description,
        debit_amount, credit_amount, line_number
    ) VALUES 
    (
        gen_random_uuid(),
        journal_entry_id,
        receivables_account_id,
        entry_description,
        entry_amount,
        0,
        1
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        entry_description,
        0,
        entry_amount,
        2
    );
    
    -- Update contract with journal entry
    UPDATE public.contracts 
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    -- Return success result
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', voucher_number,
        'amount', entry_amount,
        'entry_type', entry_type_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM,
        'error_state', SQLSTATE
    );
END;
$function$;

-- Enhanced get_mapped_account function
CREATE OR REPLACE FUNCTION public.get_mapped_account_enhanced(
    company_id_param uuid,
    account_type_code_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_id uuid;
BEGIN
    SELECT am.chart_of_accounts_id INTO account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = account_type_code_param
    AND am.is_active = true
    LIMIT 1;
    
    RETURN account_id;
END;
$function$;

-- Enhanced create_customer_financial_account function
CREATE OR REPLACE FUNCTION public.create_customer_financial_account_enhanced(
    customer_id_param uuid,
    user_id_param uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    current_user_id uuid;
    receivables_account_id uuid;
    customer_account_id uuid;
    account_code text;
    account_name text;
    result jsonb;
BEGIN
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Get customer details
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CUSTOMER_NOT_FOUND',
            'error_message', 'Customer not found'
        );
    END IF;
    
    -- Check if account already exists
    IF EXISTS(
        SELECT 1 FROM public.customer_accounts 
        WHERE customer_id = customer_id_param
    ) THEN
        SELECT account_id INTO customer_account_id
        FROM public.customer_accounts
        WHERE customer_id = customer_id_param
        LIMIT 1;
        
        RETURN jsonb_build_object(
            'success', true,
            'account_id', customer_account_id,
            'message', 'Account already exists'
        );
    END IF;
    
    -- Get receivables parent account
    receivables_account_id := public.get_mapped_account_enhanced(
        customer_record.company_id, 
        'RECEIVABLES'
    );
    
    IF receivables_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'RECEIVABLES_ACCOUNT_NOT_FOUND',
            'error_message', 'No receivables account mapping found'
        );
    END IF;
    
    -- Generate account code and name
    account_code := 'CUST-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.chart_of_accounts 
        WHERE company_id = customer_record.company_id
        AND account_code LIKE 'CUST-%'
    )::TEXT, 4, '0');
    
    account_name := CASE customer_record.customer_type
        WHEN 'individual' THEN customer_record.first_name || ' ' || customer_record.last_name
        ELSE customer_record.company_name
    END;
    
    -- Create customer account in chart of accounts
    INSERT INTO public.chart_of_accounts (
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        parent_account_id,
        account_level,
        current_balance,
        is_active,
        is_header
    ) VALUES (
        customer_record.company_id,
        account_code,
        account_name,
        account_name,
        'assets',
        'current_assets',
        'debit',
        receivables_account_id,
        4,
        0,
        true,
        false
    ) RETURNING id INTO customer_account_id;
    
    -- Link customer to account
    INSERT INTO public.customer_accounts (
        customer_id,
        account_id,
        company_id,
        account_type,
        is_active
    ) VALUES (
        customer_id_param,
        customer_account_id,
        customer_record.company_id,
        'receivables',
        true
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'account_id', customer_account_id,
        'account_code', account_code,
        'account_name', account_name
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM
    );
END;
$function$;

-- Enhanced create_payment_journal_entry function
CREATE OR REPLACE FUNCTION public.create_payment_journal_entry_enhanced(
    payment_id_param uuid,
    user_id_param uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    payment_record RECORD;
    current_user_id uuid;
    customer_account_id uuid;
    cash_account_id uuid;
    journal_entry_id uuid;
    voucher_number text;
    result jsonb;
BEGIN
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Get payment details
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PAYMENT_NOT_FOUND',
            'error_message', 'Payment not found'
        );
    END IF;
    
    -- Skip if journal entry already exists
    IF payment_record.journal_entry_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'journal_entry_id', payment_record.journal_entry_id,
            'message', 'Journal entry already exists'
        );
    END IF;
    
    -- Get customer account
    SELECT account_id INTO customer_account_id
    FROM public.customer_accounts
    WHERE customer_id = payment_record.customer_id
    AND company_id = payment_record.company_id
    LIMIT 1;
    
    IF customer_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CUSTOMER_ACCOUNT_NOT_FOUND',
            'error_message', 'Customer account not found'
        );
    END IF;
    
    -- Get cash account
    cash_account_id := public.get_mapped_account_enhanced(
        payment_record.company_id, 
        'CASH'
    );
    
    IF cash_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CASH_ACCOUNT_NOT_FOUND',
            'error_message', 'Cash account not found'
        );
    END IF;
    
    -- Generate voucher number
    voucher_number := 'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
        LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = payment_record.company_id 
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        )::TEXT, 4, '0');
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id, company_id, entry_date, description, reference_number,
        total_amount, status, created_by
    ) VALUES (
        gen_random_uuid(),
        payment_record.company_id,
        payment_record.payment_date,
        'Payment received - ' || payment_record.payment_number,
        voucher_number,
        payment_record.amount,
        'posted',
        current_user_id
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, description,
        debit_amount, credit_amount, line_number
    ) VALUES 
    (
        gen_random_uuid(),
        journal_entry_id,
        cash_account_id,
        'Payment received',
        payment_record.amount,
        0,
        1
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        customer_account_id,
        'Payment received',
        0,
        payment_record.amount,
        2
    );
    
    -- Update payment with journal entry
    UPDATE public.payments 
    SET journal_entry_id = journal_entry_id
    WHERE id = payment_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', voucher_number,
        'amount', payment_record.amount
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM
    );
END;
$function$;

-- 3. UPDATE EXISTING FUNCTIONS THAT REFERENCE OLD VERSIONS
-- ========================================================

-- Update create_contract_safe to use enhanced journal entry function
CREATE OR REPLACE FUNCTION public.create_contract_safe(
    contract_data jsonb, 
    user_id_param uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_id uuid;
    journal_result jsonb;
    validation_result jsonb;
    current_user_id uuid;
    start_time timestamp := clock_timestamp();
    result jsonb;
    contract_number_generated text;
    user_company_id uuid;
BEGIN
    -- Get current user ID
    current_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Log start of operation
    PERFORM log_contract_creation_step(
        (contract_data->>'company_id')::uuid,
        NULL,
        'contract_creation_start',
        'started',
        NULL,
        jsonb_build_object(
            'user_id', current_user_id,
            'contract_type', contract_data->>'contract_type',
            'start_time', start_time
        )
    );
    
    -- Get user's company ID for validation
    SELECT company_id INTO user_company_id
    FROM public.profiles 
    WHERE user_id = current_user_id 
    LIMIT 1;
    
    IF user_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'USER_COMPANY_NOT_FOUND',
            'error_message', 'User company not found',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Validate that contract belongs to user's company
    IF (contract_data->>'company_id')::uuid != user_company_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'COMPANY_MISMATCH',
            'error_message', 'Contract company does not match user company',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Validate contract data
    validation_result := public.validate_contract_data(contract_data);
    
    IF NOT (validation_result->>'valid')::boolean THEN
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            NULL,
            'contract_validation',
            'failed',
            'Contract validation failed',
            jsonb_build_object('validation_errors', validation_result->'errors')
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'VALIDATION_FAILED',
            'validation_errors', validation_result->'errors',
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END IF;
    
    -- Log successful validation
    PERFORM log_contract_creation_step(
        (contract_data->>'company_id')::uuid,
        NULL,
        'contract_validation',
        'completed',
        NULL,
        jsonb_build_object('validation_result', validation_result)
    );
    
    -- Generate contract number if not provided
    IF contract_data->>'contract_number' IS NULL OR contract_data->>'contract_number' = '' THEN
        contract_number_generated := 'CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.contracts 
            WHERE company_id = (contract_data->>'company_id')::uuid 
            AND EXTRACT(YEAR FROM contract_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 4, '0');
        
        contract_data := jsonb_set(contract_data, '{contract_number}', to_jsonb(contract_number_generated));
    END IF;
    
    -- Create the contract
    BEGIN
        INSERT INTO public.contracts (
            company_id, customer_id, vehicle_id, contract_number, contract_type,
            contract_date, start_date, end_date, contract_amount, monthly_amount,
            status, description, terms, created_by, cost_center_id
        ) VALUES (
            (contract_data->>'company_id')::uuid,
            (contract_data->>'customer_id')::uuid,
            NULLIF(contract_data->>'vehicle_id', '')::uuid,
            contract_data->>'contract_number',
            contract_data->>'contract_type',
            (contract_data->>'contract_date')::date,
            (contract_data->>'start_date')::date,
            (contract_data->>'end_date')::date,
            (contract_data->>'contract_amount')::numeric,
            (contract_data->>'monthly_amount')::numeric,
            'draft',
            contract_data->>'description',
            contract_data->>'terms',
            current_user_id,
            NULLIF(contract_data->>'cost_center_id', '')::uuid
        ) RETURNING id INTO contract_id;
        
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            contract_id,
            'contract_creation',
            'completed',
            NULL,
            jsonb_build_object(
                'contract_id', contract_id,
                'contract_number', contract_data->>'contract_number'
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            NULL,
            'contract_creation',
            'failed',
            'Contract insertion failed: ' || SQLERRM,
            jsonb_build_object('error_state', SQLSTATE, 'error_detail', SQLERRM)
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONTRACT_CREATION_FAILED',
            'error_message', 'Failed to create contract: ' || SQLERRM,
            'error_state', SQLSTATE,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    END;
    
    -- Create journal entry using the enhanced function
    journal_result := public.create_contract_journal_entry_enhanced(
        contract_id,
        current_user_id,
        'contract_creation'
    );
    
    IF NOT (journal_result->>'success')::boolean THEN
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            contract_id,
            'journal_entry_creation',
            'failed',
            journal_result->>'error_message',
            jsonb_build_object(
                'journal_error_code', journal_result->>'error_code',
                'journal_result', journal_result
            )
        );
        
        -- Update contract status to active anyway
        UPDATE public.contracts 
        SET status = 'active' 
        WHERE id = contract_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'contract_id', contract_id,
            'contract_number', contract_data->>'contract_number',
            'status', 'active',
            'journal_entry_warning', true,
            'journal_error', journal_result,
            'contract_data', contract_data,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        );
    ELSE
        PERFORM log_contract_creation_step(
            (contract_data->>'company_id')::uuid,
            contract_id,
            'journal_entry_creation',
            'completed',
            NULL,
            jsonb_build_object(
                'journal_entry_id', journal_result->>'journal_entry_id',
                'journal_entry_number', journal_result->>'journal_entry_number'
            )
        );
    END IF;
    
    -- Update contract status to active
    UPDATE public.contracts 
    SET status = 'active' 
    WHERE id = contract_id;
    
    -- Log completion
    PERFORM log_contract_creation_step(
        (contract_data->>'company_id')::uuid,
        contract_id,
        'contract_creation_complete',
        'completed',
        NULL,
        jsonb_build_object(
            'total_execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        )
    );
    
    -- Build success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', contract_id,
        'contract_number', contract_data->>'contract_number',
        'status', 'active',
        'journal_entry_id', journal_result->>'journal_entry_id',
        'journal_entry_number', journal_result->>'journal_entry_number',
        'contract_data', contract_data,
        'journal_result', journal_result,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    IF contract_id IS NOT NULL THEN
        DELETE FROM public.contracts WHERE id = contract_id;
    END IF;
    
    PERFORM log_contract_creation_step(
        COALESCE((contract_data->>'company_id')::uuid, user_company_id),
        contract_id,
        'contract_creation_error',
        'failed',
        'Unexpected error: ' || SQLERRM,
        jsonb_build_object(
            'error_state', SQLSTATE,
            'error_detail', SQLERRM,
            'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
        )
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM,
        'error_state', SQLSTATE,
        'execution_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000
    );
END;
$function$;