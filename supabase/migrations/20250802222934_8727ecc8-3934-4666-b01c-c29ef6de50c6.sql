-- =====================================================
-- COMPREHENSIVE CONTRACT CREATION FIX
-- This migration fixes the contract creation and journal entry issues
-- =====================================================

-- First, drop any existing conflicting functions
DROP FUNCTION IF EXISTS public.create_contract_with_journal_entry(jsonb);
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid);
DROP FUNCTION IF EXISTS public.get_mapped_account_id(uuid, text);

-- Create enhanced account mapping function
CREATE OR REPLACE FUNCTION public.get_mapped_account_id(company_id_param uuid, account_type_code_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_id uuid;
BEGIN
    -- Try account mappings first
    SELECT am.chart_of_accounts_id INTO account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = account_type_code_param
    AND am.is_active = true
    LIMIT 1;
    
    -- If no mapping found, try to find by account naming patterns
    IF account_id IS NULL THEN
        CASE account_type_code_param
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
                LIMIT 1;
                
            WHEN 'RENTAL_REVENUE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'revenue'
                AND (account_name ILIKE '%rental%' 
                     OR account_name ILIKE '%rent%'
                     OR account_name ILIKE '%إيجار%'
                     OR account_code LIKE '4%')
                AND is_active = true
                AND is_header = false
                LIMIT 1;
                
            WHEN 'SALES_REVENUE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'revenue'
                AND (account_name ILIKE '%sales%' 
                     OR account_name ILIKE '%مبيعات%'
                     OR account_code LIKE '41%')
                AND is_active = true
                AND is_header = false
                LIMIT 1;
        END CASE;
    END IF;
    
    RETURN account_id;
END;
$function$;

-- Create comprehensive contract creation function
CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    -- Contract variables
    new_contract_id uuid;
    new_contract_number text;
    contract_company_id uuid;
    contract_created_by uuid;
    
    -- Journal entry variables
    journal_entry_id uuid;
    journal_entry_number text;
    receivable_account_id uuid;
    revenue_account_id uuid;
    contract_cost_center_id uuid;
    
    -- Validation variables
    customer_status text;
    vehicle_availability text;
    user_company_id uuid;
    
    -- Result variables
    result jsonb := '{"success": false}'::jsonb;
    warnings text[] := ARRAY[]::text[];
    
    -- Logging variables
    operation_start_time timestamp := now();
    step_name text;
    
BEGIN
    -- =====================================
    -- STEP 1: VALIDATION AND SETUP
    -- =====================================
    step_name := 'validation_and_setup';
    
    -- Get user's company
    SELECT get_user_company(auth.uid()) INTO user_company_id;
    contract_company_id := COALESCE((contract_data->>'company_id')::uuid, user_company_id);
    contract_created_by := COALESCE((contract_data->>'created_by')::uuid, auth.uid());
    
    -- Validate user has permission for this company
    IF contract_company_id != user_company_id AND NOT has_role(auth.uid(), 'super_admin'::user_role) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Cannot create contract for different company',
            'error_code', 'UNAUTHORIZED'
        );
    END IF;
    
    -- Validate required fields
    IF (contract_data->>'customer_id') IS NULL OR (contract_data->>'customer_id') = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Customer ID is required',
            'error_code', 'MISSING_CUSTOMER_ID'
        );
    END IF;
    
    IF (contract_data->>'contract_amount')::numeric <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contract amount must be greater than 0',
            'error_code', 'INVALID_AMOUNT'
        );
    END IF;
    
    -- Validate customer status
    SELECT 
        CASE 
            WHEN is_blacklisted = true THEN 'blacklisted'
            WHEN is_active = false THEN 'inactive'
            ELSE 'active'
        END INTO customer_status
    FROM public.customers
    WHERE id = (contract_data->>'customer_id')::uuid
    AND company_id = contract_company_id;
    
    IF customer_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Customer not found',
            'error_code', 'CUSTOMER_NOT_FOUND'
        );
    END IF;
    
    IF customer_status = 'blacklisted' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العميل محظور ولا يمكن إنشاء عقود معه',
            'error_code', 'CUSTOMER_BLACKLISTED'
        );
    END IF;
    
    IF customer_status = 'inactive' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العميل غير نشط',
            'error_code', 'CUSTOMER_INACTIVE'
        );
    END IF;
    
    -- Validate vehicle if specified
    IF (contract_data->>'vehicle_id') IS NOT NULL AND (contract_data->>'vehicle_id') != '' AND (contract_data->>'vehicle_id') != 'none' THEN
        SELECT status INTO vehicle_availability
        FROM public.vehicles
        WHERE id = (contract_data->>'vehicle_id')::uuid
        AND company_id = contract_company_id;
        
        IF vehicle_availability IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'المركبة غير موجودة',
                'error_code', 'VEHICLE_NOT_FOUND'
            );
        END IF;
        
        IF vehicle_availability NOT IN ('available', 'reserved') THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'المركبة غير متاحة حالياً',
                'error_code', 'VEHICLE_UNAVAILABLE'
            );
        END IF;
    END IF;
    
    -- Log validation completion
    INSERT INTO public.contract_creation_log (
        company_id, operation_step, status, metadata, execution_time_ms
    ) VALUES (
        contract_company_id, step_name, 'completed', 
        jsonb_build_object('customer_id', contract_data->>'customer_id'),
        EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
    );
    
    -- =====================================
    -- STEP 2: GENERATE CONTRACT NUMBER
    -- =====================================
    step_name := 'contract_number_generation';
    operation_start_time := now();
    
    SELECT 'CNT-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || 
           LPAD((COUNT(*) + 1)::TEXT, 4, '0') INTO new_contract_number
    FROM public.contracts 
    WHERE company_id = contract_company_id 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- =====================================
    -- STEP 3: CREATE CONTRACT
    -- =====================================
    step_name := 'contract_creation';
    operation_start_time := now();
    
    -- Get cost center (customer's default or fallback)
    contract_cost_center_id := COALESCE(
        (contract_data->>'cost_center_id')::uuid,
        public.get_customer_default_cost_center((contract_data->>'customer_id')::uuid)
    );
    
    -- Insert contract
    INSERT INTO public.contracts (
        id, company_id, customer_id, vehicle_id, contract_number, contract_type,
        contract_date, start_date, end_date, contract_amount, monthly_amount,
        description, terms, status, created_by, cost_center_id
    ) VALUES (
        gen_random_uuid(), contract_company_id, (contract_data->>'customer_id')::uuid,
        NULLIF((contract_data->>'vehicle_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
        new_contract_number, COALESCE(contract_data->>'contract_type', 'rental'),
        COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
        (contract_data->>'start_date')::date, (contract_data->>'end_date')::date,
        (contract_data->>'contract_amount')::numeric, 
        COALESCE((contract_data->>'monthly_amount')::numeric, (contract_data->>'contract_amount')::numeric),
        contract_data->>'description', contract_data->>'terms',
        'draft', contract_created_by, contract_cost_center_id
    ) RETURNING id INTO new_contract_id;
    
    -- Log contract creation
    INSERT INTO public.contract_creation_log (
        company_id, contract_id, operation_step, status, metadata, execution_time_ms
    ) VALUES (
        contract_company_id, new_contract_id, step_name, 'completed', 
        jsonb_build_object('contract_id', new_contract_id, 'contract_number', new_contract_number),
        EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
    );
    
    -- =====================================
    -- STEP 4: CREATE JOURNAL ENTRY
    -- =====================================
    step_name := 'journal_entry_creation';
    operation_start_time := now();
    
    BEGIN
        -- Get account mappings
        receivable_account_id := public.get_mapped_account_id(contract_company_id, 'RECEIVABLES');
        revenue_account_id := public.get_mapped_account_id(contract_company_id, 'RENTAL_REVENUE');
        
        -- Fallback to sales revenue if rental revenue not found
        IF revenue_account_id IS NULL THEN
            revenue_account_id := public.get_mapped_account_id(contract_company_id, 'SALES_REVENUE');
        END IF;
        
        -- Check if we have required accounts
        IF receivable_account_id IS NULL THEN
            warnings := array_append(warnings, 'No receivables account found - journal entry creation skipped');
            
            -- Log warning and continue
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, 
                error_message, metadata, execution_time_ms
            ) VALUES (
                contract_company_id, new_contract_id, step_name, 'skipped_missing_accounts', 
                'Missing receivables account mapping',
                jsonb_build_object('requires_manual_entry', true),
                EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
            );
            
        ELSIF revenue_account_id IS NULL THEN
            warnings := array_append(warnings, 'No revenue account found - journal entry creation skipped');
            
            -- Log warning and continue
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, 
                error_message, metadata, execution_time_ms
            ) VALUES (
                contract_company_id, new_contract_id, step_name, 'skipped_missing_accounts', 
                'Missing revenue account mapping',
                jsonb_build_object('requires_manual_entry', true),
                EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
            );
            
        ELSE
            -- Generate journal entry number
            SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || 
                   LPAD((COUNT(*) + 1)::TEXT, 4, '0') INTO journal_entry_number
            FROM public.journal_entries 
            WHERE company_id = contract_company_id 
            AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE);
            
            -- Create journal entry
            INSERT INTO public.journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, reference_id, total_debit, total_credit,
                status, created_by
            ) VALUES (
                gen_random_uuid(), contract_company_id, journal_entry_number,
                COALESCE((contract_data->>'contract_date')::date, CURRENT_DATE),
                'Contract Accrual - ' || new_contract_number,
                'contract', new_contract_id, (contract_data->>'contract_amount')::numeric,
                (contract_data->>'contract_amount')::numeric, 'draft', contract_created_by
            ) RETURNING id INTO journal_entry_id;
            
            -- Create debit line (Accounts Receivable)
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), journal_entry_id, receivable_account_id, 
                contract_cost_center_id, 1,
                'Accounts Receivable - Contract ' || new_contract_number,
                (contract_data->>'contract_amount')::numeric, 0
            );
            
            -- Create credit line (Revenue)
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), journal_entry_id, revenue_account_id, 
                contract_cost_center_id, 2,
                'Contract Revenue - ' || new_contract_number,
                0, (contract_data->>'contract_amount')::numeric
            );
            
            -- Update contract with journal entry reference
            UPDATE public.contracts 
            SET journal_entry_id = journal_entry_id 
            WHERE id = new_contract_id;
            
            -- Log successful journal entry creation
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, metadata, execution_time_ms
            ) VALUES (
                contract_company_id, new_contract_id, step_name, 'completed', 
                jsonb_build_object('journal_entry_id', journal_entry_id, 'entry_number', journal_entry_number),
                EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
            );
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log journal entry failure but don't fail the entire transaction
            INSERT INTO public.contract_creation_log (
                company_id, contract_id, operation_step, status, 
                error_message, metadata, execution_time_ms
            ) VALUES (
                contract_company_id, new_contract_id, step_name, 'failed_recoverable', 
                SQLSTATE || ': ' || SQLERRM,
                jsonb_build_object('requires_manual_entry', true),
                EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
            );
            
            warnings := array_append(warnings, 'Journal entry creation failed - manual entry required: ' || SQLERRM);
    END;
    
    -- =====================================
    -- STEP 5: FINALIZATION
    -- =====================================
    step_name := 'finalization';
    operation_start_time := now();
    
    -- Build success result
    result := jsonb_build_object(
        'success', true,
        'contract_id', new_contract_id,
        'contract_number', new_contract_number,
        'journal_entry_id', journal_entry_id,
        'journal_entry_number', journal_entry_number,
        'requires_manual_entry', (journal_entry_id IS NULL),
        'warnings', array_to_json(warnings)
    );
    
    -- Log final completion
    INSERT INTO public.contract_creation_log (
        company_id, contract_id, operation_step, status, metadata, execution_time_ms
    ) VALUES (
        contract_company_id, new_contract_id, step_name, 'completed', 
        result,
        EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log critical failure
        INSERT INTO public.contract_creation_log (
            company_id, contract_id, operation_step, status, 
            error_message, metadata, execution_time_ms
        ) VALUES (
            contract_company_id, COALESCE(new_contract_id, '00000000-0000-0000-0000-000000000000'::uuid), 
            COALESCE(step_name, 'unknown'), 'failed_critical', 
            SQLSTATE || ': ' || SQLERRM,
            jsonb_build_object('contract_data', contract_data),
            EXTRACT(epoch FROM (now() - operation_start_time)) * 1000
        );
        
        -- Return error
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to create contract: ' || SQLERRM,
            'error_code', 'CRITICAL_FAILURE',
            'error_message', SQLERRM
        );
END;
$function$;

-- Create helper function for getting customer default cost center
CREATE OR REPLACE FUNCTION public.get_customer_default_cost_center(customer_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cost_center_id uuid;
    customer_company_id uuid;
BEGIN
    -- Get customer's company
    SELECT company_id INTO customer_company_id
    FROM public.customers
    WHERE id = customer_id_param;
    
    -- Try to get customer's specific cost center
    SELECT default_cost_center_id INTO cost_center_id
    FROM public.customers
    WHERE id = customer_id_param
    AND default_cost_center_id IS NOT NULL;
    
    -- Fallback to SALES cost center
    IF cost_center_id IS NULL THEN
        SELECT id INTO cost_center_id
        FROM public.cost_centers
        WHERE company_id = customer_company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Final fallback to any active cost center
    IF cost_center_id IS NULL THEN
        SELECT id INTO cost_center_id
        FROM public.cost_centers
        WHERE company_id = customer_company_id
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN cost_center_id;
END;
$function$;

-- Create function to generate journal entry numbers
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    entry_count INTEGER;
    year_month_suffix TEXT;
BEGIN
    -- Get current year and month
    year_month_suffix := TO_CHAR(CURRENT_DATE, 'YYYYMM');
    
    -- Count existing entries for this company in current month
    SELECT COUNT(*) + 1 INTO entry_count
    FROM public.journal_entries 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- Return formatted entry number
    RETURN 'JE-' || year_month_suffix || '-' || LPAD(entry_count::TEXT, 4, '0');
END;
$function$;