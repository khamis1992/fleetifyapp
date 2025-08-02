-- =============================================
-- COMPREHENSIVE FUNCTION CLEANUP MIGRATION
-- Removing duplicate/conflicting function versions
-- =============================================

-- 1. DROP all versions of create_contract_journal_entry and keep only the enhanced version
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, text);

-- Keep only the enhanced version (create_contract_journal_entry_enhanced)
-- No action needed as it's already the correct one

-- 2. DROP all old versions of create_customer_financial_account
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid);
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text);

-- Create the unified create_customer_financial_account function
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    customer_id_param uuid,
    account_id_param uuid DEFAULT NULL,
    account_name_override text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    account_record RECORD;
    new_account_id uuid;
    account_code text;
    account_name text;
    customer_account_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
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
    
    -- Check if customer already has a financial account
    SELECT id INTO customer_account_id
    FROM public.customer_accounts
    WHERE customer_id = customer_id_param
    LIMIT 1;
    
    IF customer_account_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'customer_account_id', customer_account_id,
            'message', 'Customer already has a financial account'
        );
    END IF;
    
    -- Use provided account or create new one
    IF account_id_param IS NOT NULL THEN
        -- Validate provided account
        SELECT * INTO account_record
        FROM public.chart_of_accounts
        WHERE id = account_id_param
        AND company_id = customer_record.company_id
        AND is_active = true;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_ACCOUNT',
                'error_message', 'Provided account not found or inactive'
            );
        END IF;
        
        new_account_id := account_id_param;
    ELSE
        -- Generate account code and name
        IF customer_record.customer_type = 'individual' THEN
            account_code := 'AR-' || UPPER(LEFT(COALESCE(customer_record.first_name, 'CUST'), 3)) || '-' || SUBSTRING(customer_record.id::text, 1, 8);
            account_name := COALESCE(
                account_name_override,
                customer_record.first_name || ' ' || customer_record.last_name || ' - Receivable'
            );
        ELSE
            account_code := 'AR-' || UPPER(LEFT(COALESCE(customer_record.company_name, 'COMP'), 3)) || '-' || SUBSTRING(customer_record.id::text, 1, 8);
            account_name := COALESCE(
                account_name_override,
                customer_record.company_name || ' - Receivable'
            );
        END IF;
        
        -- Create new receivables account
        INSERT INTO public.chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            account_subtype,
            balance_type,
            account_level,
            is_active,
            parent_account_id
        ) VALUES (
            customer_record.company_id,
            account_code,
            account_name,
            account_name,
            'assets',
            'current_assets',
            'debit',
            5,
            true,
            (SELECT id FROM public.chart_of_accounts 
             WHERE company_id = customer_record.company_id 
             AND account_type = 'assets' 
             AND account_subtype = 'current_assets'
             AND is_header = true 
             LIMIT 1)
        ) RETURNING id INTO new_account_id;
    END IF;
    
    -- Create customer account record
    INSERT INTO public.customer_accounts (
        customer_id,
        account_id,
        company_id,
        is_active,
        created_by
    ) VALUES (
        customer_id_param,
        new_account_id,
        customer_record.company_id,
        true,
        current_user_id
    ) RETURNING id INTO customer_account_id;
    
    -- Update customer with the account reference
    UPDATE public.customers
    SET account_id = new_account_id
    WHERE id = customer_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'customer_account_id', customer_account_id,
        'chart_of_accounts_id', new_account_id,
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

-- 3. DROP old version of create_contract_safe (keep the current enhanced one)
-- The current version in the context is already the correct one, no changes needed

-- 4. DROP old versions of cleanup_contract_issues
DROP FUNCTION IF EXISTS public.cleanup_contract_issues();
DROP FUNCTION IF EXISTS public.cleanup_contract_issues(uuid);

-- Create unified cleanup_contract_issues function
CREATE OR REPLACE FUNCTION public.cleanup_contract_issues(company_id_param uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cleaned_contracts integer := 0;
    processed_logs integer := 0;
    current_user_id uuid;
    target_company_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    -- Determine target company
    IF company_id_param IS NOT NULL THEN
        target_company_id := company_id_param;
    ELSE
        -- Get user's company
        SELECT company_id INTO target_company_id
        FROM public.profiles
        WHERE user_id = current_user_id;
        
        IF target_company_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_message', 'User company not found'
            );
        END IF;
    END IF;
    
    -- Clean up orphaned contract logs
    processed_logs := public.cleanup_orphaned_contract_logs();
    
    -- Update contracts with missing status
    UPDATE public.contracts
    SET status = 'active'
    WHERE company_id = target_company_id
    AND status IS NULL
    AND journal_entry_id IS NOT NULL;
    
    GET DIAGNOSTICS cleaned_contracts = ROW_COUNT;
    
    -- Clean up draft contracts older than 7 days
    DELETE FROM public.contracts
    WHERE company_id = target_company_id
    AND status = 'draft'
    AND created_at < now() - INTERVAL '7 days'
    AND journal_entry_id IS NULL;
    
    RETURN jsonb_build_object(
        'success', true,
        'cleaned_contracts', cleaned_contracts,
        'processed_logs', processed_logs,
        'company_id', target_company_id
    );
END;
$function$;

-- 5. DROP old versions of create_payment_journal_entry
DROP FUNCTION IF EXISTS public.create_payment_journal_entry(uuid, numeric);
DROP FUNCTION IF EXISTS public.create_payment_journal_entry(uuid, numeric, text);

-- Create unified create_payment_journal_entry function
CREATE OR REPLACE FUNCTION public.create_payment_journal_entry(
    payment_id_param uuid,
    amount_param numeric,
    payment_type_param text DEFAULT 'payment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    payment_record RECORD;
    journal_entry_id uuid;
    journal_entry_number text;
    cash_account_id uuid;
    receivables_account_id uuid;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    -- Get payment details
    SELECT p.*, c.company_id, c.contract_number, cust.account_id as customer_account_id
    INTO payment_record
    FROM public.payments p
    LEFT JOIN public.contracts c ON p.contract_id = c.id
    LEFT JOIN public.customers cust ON c.customer_id = cust.id
    WHERE p.id = payment_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PAYMENT_NOT_FOUND',
            'error_message', 'Payment not found'
        );
    END IF;
    
    -- Get cash account (from bank or default)
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND (account_type = 'assets' AND account_subtype = 'current_assets')
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%' OR account_code LIKE '111%')
    AND is_active = true
    AND is_header = false
    ORDER BY account_code
    LIMIT 1;
    
    -- Get receivables account
    receivables_account_id := payment_record.customer_account_id;
    
    IF receivables_account_id IS NULL THEN
        -- Find default receivables account
        SELECT id INTO receivables_account_id
        FROM public.chart_of_accounts
        WHERE company_id = payment_record.company_id
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_code LIKE '112%')
        AND is_active = true
        AND is_header = false
        ORDER BY account_code
        LIMIT 1;
    END IF;
    
    IF cash_account_id IS NULL OR receivables_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACCOUNTS_NOT_FOUND',
            'error_message', 'Required accounts not found'
        );
    END IF;
    
    -- Generate journal entry number
    journal_entry_number := 'PAY-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = payment_record.company_id 
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
        payment_record.company_id,
        journal_entry_number,
        CURRENT_DATE,
        'Payment received for contract ' || payment_record.contract_number,
        'payment',
        payment_id_param,
        current_user_id,
        'posted'
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Cash Account
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        journal_entry_id,
        cash_account_id,
        'Cash received from customer payment',
        amount_param,
        0
    );
    
    -- Credit: Accounts Receivable
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        journal_entry_id,
        receivables_account_id,
        'Payment received from customer',
        0,
        amount_param
    );
    
    -- Update payment with journal entry reference
    UPDATE public.payments
    SET journal_entry_id = journal_entry_id
    WHERE id = payment_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', journal_entry_number,
        'amount', amount_param
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', SQLERRM
    );
END;
$function$;

-- 6. Clean up any other potential duplicate functions
-- Check for other common duplicated functions

-- Drop old monitor_contract_health versions if they exist
DROP FUNCTION IF EXISTS public.monitor_contract_health();
DROP FUNCTION IF EXISTS public.monitor_contract_health(uuid);

-- Create unified monitor_contract_health function
CREATE OR REPLACE FUNCTION public.monitor_contract_health(company_id_param uuid DEFAULT NULL)
RETURNS TABLE(
    issue_id uuid,
    issue_type text,
    description text,
    severity text,
    recommended_action text,
    contract_id uuid,
    contract_number text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    target_company_id uuid;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    -- Determine target company
    IF company_id_param IS NOT NULL THEN
        target_company_id := company_id_param;
    ELSE
        -- Get user's company
        SELECT company_id INTO target_company_id
        FROM public.profiles
        WHERE user_id = current_user_id;
    END IF;
    
    IF target_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    -- Check for contracts without journal entries
    SELECT
        gen_random_uuid() as issue_id,
        'missing_journal_entry'::text as issue_type,
        'Contract is active but missing journal entry'::text as description,
        'warning'::text as severity,
        'Create journal entry for this contract'::text as recommended_action,
        c.id as contract_id,
        c.contract_number::text as contract_number,
        c.created_at
    FROM public.contracts c
    WHERE c.company_id = target_company_id
    AND c.status = 'active'
    AND c.journal_entry_id IS NULL
    
    UNION ALL
    
    -- Check for draft contracts older than 24 hours
    SELECT
        gen_random_uuid() as issue_id,
        'stale_draft'::text as issue_type,
        'Draft contract older than 24 hours'::text as description,
        'info'::text as severity,
        'Review and complete or delete this draft'::text as recommended_action,
        c.id as contract_id,
        c.contract_number::text as contract_number,
        c.created_at
    FROM public.contracts c
    WHERE c.company_id = target_company_id
    AND c.status = 'draft'
    AND c.created_at < now() - INTERVAL '24 hours'
    
    UNION ALL
    
    -- Check for failed contract creation logs in last 24 hours
    SELECT
        gen_random_uuid() as issue_id,
        'creation_failure'::text as issue_type,
        'Recent contract creation failure detected'::text as description,
        'critical'::text as severity,
        'Investigate and retry contract creation'::text as recommended_action,
        ccl.contract_id as contract_id,
        COALESCE(c.contract_number, 'Unknown')::text as contract_number,
        ccl.created_at
    FROM public.contract_creation_log ccl
    LEFT JOIN public.contracts c ON ccl.contract_id = c.id
    WHERE ccl.company_id = target_company_id
    AND ccl.status = 'failed'
    AND ccl.created_at > now() - INTERVAL '24 hours'
    
    ORDER BY created_at DESC;
END;
$function$;