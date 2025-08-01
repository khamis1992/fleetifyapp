-- Phase 1 & 2: Database Functions and Triggers for Contract Journal Entry Management

-- First, let's improve the get_mapped_account_id function with better error handling
CREATE OR REPLACE FUNCTION public.get_mapped_account_id(company_id_param uuid, account_type_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    mapped_account_id uuid;
    default_account_id uuid;
BEGIN
    -- First try to get mapped account
    SELECT coa.id INTO mapped_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    JOIN public.chart_of_accounts coa ON am.chart_of_accounts_id = coa.id
    WHERE am.company_id = company_id_param
    AND dat.account_type = account_type_param
    AND am.is_active = true
    AND coa.is_active = true
    LIMIT 1;
    
    -- If no mapping found, try to find a default account by name patterns
    IF mapped_account_id IS NULL THEN
        CASE account_type_param
            WHEN 'RECEIVABLES' THEN
                SELECT id INTO default_account_id
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
                SELECT id INTO default_account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'revenue'
                AND (account_name ILIKE '%sales%' 
                     OR account_name ILIKE '%revenue%'
                     OR account_name ILIKE '%مبيعات%'
                     OR account_name ILIKE '%إيراد%'
                     OR account_code LIKE '4%')
                AND is_active = true
                AND is_header = false
                ORDER BY account_code
                LIMIT 1;
            WHEN 'RENTAL_REVENUE' THEN
                SELECT id INTO default_account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'revenue'
                AND (account_name ILIKE '%rental%' 
                     OR account_name ILIKE '%rent%'
                     OR account_name ILIKE '%إيجار%'
                     OR account_code LIKE '41%')
                AND is_active = true
                AND is_header = false
                ORDER BY account_code
                LIMIT 1;
        END CASE;
        
        mapped_account_id := default_account_id;
    END IF;
    
    RETURN mapped_account_id;
END;
$function$;

-- Enhanced contract journal entry creation with retry mechanism
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
    retry_count integer := 0;
    max_retries integer := 3;
    wait_seconds integer := 1;
BEGIN
    -- Retry loop to handle transaction isolation issues
    LOOP
        BEGIN
            -- Try to get the contract with explicit lock
            SELECT * INTO contract_record
            FROM public.contracts
            WHERE id = contract_id_param
            FOR UPDATE;
            
            IF NOT FOUND THEN
                IF retry_count < max_retries THEN
                    retry_count := retry_count + 1;
                    RAISE LOG 'Contract % not found, retry % of %', contract_id_param, retry_count, max_retries;
                    PERFORM pg_sleep(wait_seconds);
                    wait_seconds := wait_seconds * 2; -- Exponential backoff
                    CONTINUE;
                ELSE
                    RAISE EXCEPTION 'Contract with ID % not found after % retries', contract_id_param, max_retries;
                END IF;
            END IF;
            
            -- Exit retry loop if contract found
            EXIT;
        EXCEPTION
            WHEN serialization_failure OR deadlock_detected THEN
                IF retry_count < max_retries THEN
                    retry_count := retry_count + 1;
                    RAISE LOG 'Transaction conflict for contract %, retry % of %', contract_id_param, retry_count, max_retries;
                    PERFORM pg_sleep(wait_seconds);
                    wait_seconds := wait_seconds * 2;
                    CONTINUE;
                ELSE
                    RAISE;
                END IF;
        END;
    END LOOP;
    
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
    
    -- Get account mappings with fallback
    receivable_account_id := public.get_mapped_account_id(contract_record.company_id, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_id(contract_record.company_id, 'SALES_REVENUE');
    
    -- If sales revenue not found, try rental revenue
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_id(contract_record.company_id, 'RENTAL_REVENUE');
    END IF;
    
    -- Validate required accounts
    IF receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'configuration_error: No receivables account configured. Please set up account mappings first.';
    END IF;
    
    IF revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'configuration_error: No revenue account configured. Please set up account mappings first.';
    END IF;
    
    -- Generate journal entry number
    SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = contract_record.company_id 
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0') INTO journal_entry_id;
    
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
        journal_entry_id,
        contract_record.contract_date,
        'Contract #' || contract_record.contract_number,
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'posted',
        contract_record.created_by
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
    ) VALUES 
    (
        gen_random_uuid(),
        journal_entry_id,
        receivable_account_id,
        sales_cost_center_id,
        1,
        'Contract receivable - ' || contract_record.contract_number,
        contract_record.contract_amount,
        0
    ),
    (
        gen_random_uuid(),
        journal_entry_id,
        revenue_account_id,
        sales_cost_center_id,
        2,
        'Contract revenue - ' || contract_record.contract_number,
        0,
        contract_record.contract_amount
    );
    
    -- Update contract with journal entry reference
    UPDATE public.contracts 
    SET 
        journal_entry_id = journal_entry_id,
        updated_at = now()
    WHERE id = contract_record.id;
    
    RAISE LOG 'Created journal entry % for contract %', journal_entry_id, contract_record.contract_number;
    
    RETURN journal_entry_id;
END;
$function$;

-- Trigger function to automatically create journal entries when contract becomes active
CREATE OR REPLACE FUNCTION public.handle_contract_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_entry_id uuid;
BEGIN
    -- Only create journal entry when status changes to active and no journal entry exists
    IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.journal_entry_id IS NULL THEN
        BEGIN
            -- Create journal entry
            journal_entry_id := public.create_contract_journal_entry(NEW.id);
            
            -- Update the NEW record with journal entry ID
            NEW.journal_entry_id := journal_entry_id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the contract update
            RAISE LOG 'Failed to create journal entry for contract %: %', NEW.id, SQLERRM;
            
            -- Insert into a background job queue for retry
            INSERT INTO public.contract_creation_log (
                company_id,
                contract_id,
                operation_step,
                status,
                error_message,
                metadata
            ) VALUES (
                NEW.company_id,
                NEW.id,
                'journal_entry_creation',
                'failed',
                SQLERRM,
                jsonb_build_object('trigger_retry', true, 'contract_status', NEW.status)
            );
        END;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_contract_activation ON public.contracts;
CREATE TRIGGER trigger_contract_activation
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_contract_activation();

-- Function to ensure essential account mappings exist
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    mapping_result jsonb := '{"status": "success", "created": [], "existing": [], "errors": []}'::jsonb;
    essential_types text[] := ARRAY['RECEIVABLES', 'SALES_REVENUE', 'RENTAL_REVENUE'];
    account_type text;
    mapping_count integer;
    account_id uuid;
    default_type_id uuid;
    created_mappings text[] := '{}';
    existing_mappings text[] := '{}';
    error_messages text[] := '{}';
BEGIN
    FOREACH account_type IN ARRAY essential_types LOOP
        -- Check if mapping already exists
        SELECT COUNT(*) INTO mapping_count
        FROM public.account_mappings am
        JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param
        AND dat.account_type = account_type
        AND am.is_active = true;
        
        IF mapping_count = 0 THEN
            -- Try to auto-create mapping
            account_id := public.get_mapped_account_id(company_id_param, account_type);
            
            IF account_id IS NOT NULL THEN
                -- Get default account type ID
                SELECT id INTO default_type_id
                FROM public.default_account_types
                WHERE account_type = account_type
                LIMIT 1;
                
                IF default_type_id IS NOT NULL THEN
                    -- Create the mapping
                    INSERT INTO public.account_mappings (
                        company_id,
                        default_account_type_id,
                        chart_of_accounts_id,
                        mapped_by
                    ) VALUES (
                        company_id_param,
                        default_type_id,
                        account_id,
                        auth.uid()
                    );
                    
                    created_mappings := array_append(created_mappings, account_type);
                ELSE
                    error_messages := array_append(error_messages, 'Default account type not found: ' || account_type);
                END IF;
            ELSE
                error_messages := array_append(error_messages, 'No suitable account found for: ' || account_type);
            END IF;
        ELSE
            existing_mappings := array_append(existing_mappings, account_type);
        END IF;
    END LOOP;
    
    -- Build result
    mapping_result := jsonb_set(mapping_result, '{created}', to_jsonb(created_mappings));
    mapping_result := jsonb_set(mapping_result, '{existing}', to_jsonb(existing_mappings));
    mapping_result := jsonb_set(mapping_result, '{errors}', to_jsonb(error_messages));
    
    IF array_length(error_messages, 1) > 0 THEN
        mapping_result := jsonb_set(mapping_result, '{status}', '"partial"'::jsonb);
    END IF;
    
    RETURN mapping_result;
END;
$function$;

-- Background job function to process failed journal entries
CREATE OR REPLACE FUNCTION public.process_failed_journal_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    failed_record record;
    journal_entry_id uuid;
BEGIN
    -- Process failed journal entry creations
    FOR failed_record IN
        SELECT DISTINCT ccl.contract_id, ccl.company_id
        FROM public.contract_creation_log ccl
        JOIN public.contracts c ON ccl.contract_id = c.id
        WHERE ccl.operation_step = 'journal_entry_creation'
        AND ccl.status = 'failed'
        AND c.status = 'active'
        AND c.journal_entry_id IS NULL
        AND ccl.created_at > now() - interval '24 hours'
    LOOP
        BEGIN
            -- Attempt to create journal entry
            journal_entry_id := public.create_contract_journal_entry(failed_record.contract_id);
            
            IF journal_entry_id IS NOT NULL THEN
                -- Mark as resolved
                INSERT INTO public.contract_creation_log (
                    company_id,
                    contract_id,
                    operation_step,
                    status,
                    metadata
                ) VALUES (
                    failed_record.company_id,
                    failed_record.contract_id,
                    'journal_entry_creation',
                    'completed',
                    jsonb_build_object('background_retry', true, 'journal_entry_id', journal_entry_id)
                );
                
                RAISE LOG 'Background job created journal entry % for contract %', journal_entry_id, failed_record.contract_id;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log retry failure
            INSERT INTO public.contract_creation_log (
                company_id,
                contract_id,
                operation_step,
                status,
                error_message,
                metadata
            ) VALUES (
                failed_record.company_id,
                failed_record.contract_id,
                'journal_entry_creation',
                'retry_failed',
                SQLERRM,
                jsonb_build_object('background_retry', true, 'retry_count', 1)
            );
        END;
    END LOOP;
END;
$function$;