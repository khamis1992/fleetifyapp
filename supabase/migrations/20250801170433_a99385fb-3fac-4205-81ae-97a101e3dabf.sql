-- Fix the contract activation trigger to handle race conditions
CREATE OR REPLACE FUNCTION public.handle_contract_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_id uuid;
    retry_count integer := 0;
    max_retries integer := 3;
    wait_time interval := '100 milliseconds';
BEGIN
    -- Only process activation from draft to active
    IF OLD.status = 'draft' AND NEW.status = 'active' AND NEW.journal_entry_id IS NULL THEN
        -- Add delay to ensure contract is fully committed
        PERFORM pg_sleep(0.1);
        
        -- Retry loop for journal entry creation
        WHILE retry_count < max_retries LOOP
            BEGIN
                -- Verify contract exists before creating journal entry
                IF NOT EXISTS (SELECT 1 FROM public.contracts WHERE id = NEW.id) THEN
                    RAISE WARNING 'Contract % not found on activation attempt %', NEW.id, retry_count + 1;
                    retry_count := retry_count + 1;
                    PERFORM pg_sleep(extract(epoch from wait_time));
                    wait_time := wait_time * 2; -- Exponential backoff
                    CONTINUE;
                END IF;
                
                -- Create journal entry with error handling
                journal_id := public.create_contract_journal_entry_safe(NEW.id);
                
                IF journal_id IS NOT NULL THEN
                    -- Update contract with journal entry ID
                    UPDATE public.contracts 
                    SET journal_entry_id = journal_id 
                    WHERE id = NEW.id;
                    
                    NEW.journal_entry_id := journal_id;
                    
                    -- Log successful creation
                    RAISE LOG 'Successfully created journal entry % for contract % on attempt %', 
                        journal_id, NEW.id, retry_count + 1;
                    EXIT; -- Success, exit retry loop
                END IF;
                
                retry_count := retry_count + 1;
                PERFORM pg_sleep(extract(epoch from wait_time));
                wait_time := wait_time * 2;
                
            EXCEPTION
                WHEN OTHERS THEN
                    retry_count := retry_count + 1;
                    RAISE WARNING 'Journal entry creation failed for contract % on attempt %: %', 
                        NEW.id, retry_count, SQLERRM;
                    
                    IF retry_count >= max_retries THEN
                        -- Log final failure but don't block contract activation
                        RAISE WARNING 'Failed to create journal entry for contract % after % attempts. Contract activated without journal entry.', 
                            NEW.id, max_retries;
                        EXIT;
                    END IF;
                    
                    PERFORM pg_sleep(extract(epoch from wait_time));
                    wait_time := wait_time * 2;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create safe journal entry function with better error handling
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry_safe(contract_id_param uuid)
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
    entry_description text;
BEGIN
    -- Fetch contract with explicit lock to ensure data consistency
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param
    AND status = 'active'
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RAISE LOG 'Contract % not found or not active for journal entry creation', contract_id_param;
        RETURN NULL;
    END IF;
    
    -- Skip if amount is zero or negative
    IF COALESCE(contract_record.contract_amount, 0) <= 0 THEN
        RAISE LOG 'Skipping journal entry for contract % - invalid amount: %', 
            contract_id_param, contract_record.contract_amount;
        RETURN NULL;
    END IF;
    
    -- Get cost center
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get account mappings with fallbacks
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_code LIKE '112%')
    AND is_active = true
    AND NOT is_header
    ORDER BY account_level DESC, account_code
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'revenue'
    AND (account_name ILIKE '%sales%' OR account_name ILIKE '%revenue%' OR account_name ILIKE '%إيراد%' OR account_code LIKE '41%')
    AND is_active = true
    AND NOT is_header
    ORDER BY account_level DESC, account_code
    LIMIT 1;
    
    -- Validate required accounts exist
    IF receivable_account_id IS NULL THEN
        RAISE WARNING 'No receivable account found for company %. Skipping journal entry.', contract_record.company_id;
        RETURN NULL;
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RAISE WARNING 'No revenue account found for company %. Skipping journal entry.', contract_record.company_id;
        RETURN NULL;
    END IF;
    
    -- Create journal entry description
    entry_description := 'Contract Revenue Recognition - ' || contract_record.contract_number;
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        total_amount,
        status,
        created_by,
        source_type,
        source_id
    ) VALUES (
        gen_random_uuid(),
        contract_record.company_id,
        'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = contract_record.company_id 
            AND DATE(entry_date) = CURRENT_DATE
        )::TEXT, 4, '0'),
        contract_record.contract_date,
        entry_description,
        contract_record.contract_amount,
        'posted',
        contract_record.created_by,
        'contract',
        contract_record.id
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Accounts Receivable
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        receivable_account_id,
        contract_record.contract_amount,
        0,
        'Accounts Receivable - ' || contract_record.contract_number,
        sales_cost_center_id
    );
    
    -- Credit: Revenue
    INSERT INTO public.journal_entry_lines (
        id,
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        cost_center_id
    ) VALUES (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        0,
        contract_record.contract_amount,
        'Contract Revenue - ' || contract_record.contract_number,
        sales_cost_center_id
    );
    
    RAISE LOG 'Successfully created journal entry % for contract %', journal_entry_id, contract_id_param;
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN lock_not_available THEN
        RAISE WARNING 'Could not acquire lock on contract % for journal entry creation', contract_id_param;
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating journal entry for contract %: %', contract_id_param, SQLERRM;
        RETURN NULL;
END;
$function$;

-- Create contract operations logging table for better monitoring
CREATE TABLE IF NOT EXISTS public.contract_creation_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    contract_id uuid,
    operation_step text NOT NULL,
    status text NOT NULL, -- 'started', 'completed', 'failed', 'retrying'
    attempt_number integer DEFAULT 1,
    error_message text,
    execution_time_ms integer,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for contract creation log
ALTER TABLE public.contract_creation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view creation logs in their company" ON public.contract_creation_log
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "System can manage creation logs" ON public.contract_creation_log
FOR ALL USING (true);

-- Create function to log contract creation steps
CREATE OR REPLACE FUNCTION public.log_contract_creation_step(
    company_id_param uuid,
    contract_id_param uuid,
    step_name text,
    status_param text,
    attempt_num integer DEFAULT 1,
    error_msg text DEFAULT NULL,
    exec_time integer DEFAULT NULL,
    meta jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,
        status,
        attempt_number,
        error_message,
        execution_time_ms,
        metadata
    ) VALUES (
        company_id_param,
        contract_id_param,
        step_name,
        status_param,
        attempt_num,
        error_msg,
        exec_time,
        meta
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Don't let logging failures affect main operations
        RAISE WARNING 'Failed to log contract creation step: %', SQLERRM;
END;
$function$;